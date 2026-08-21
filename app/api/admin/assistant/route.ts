import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin/session";
import { rateLimit, RateLimitError } from "@/lib/rate-limit";
import {
  assistantConfig,
  chatCompletion,
  type ORMessage,
} from "@/lib/assistant/openrouter";
import { TOOL_DEFS, executeTool } from "@/lib/assistant/tools";
import { formatNotebook, readNotes } from "@/lib/assistant/notes";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TOOL_ROUNDS = 8;
const MAX_HISTORY = 20;

const SYSTEM_PROMPT = `You are the Fullthrottle admin assistant — the back-office copilot for a US-market motorcycle parts store (fullthrottle: storefront + admin, Next.js + Postgres).

How the store works:
- The catalog is data-driven. Sections own attribute templates; every attribute automatically becomes a storefront filter (if filterable), a spec-table row and a product-form field. Product "values" are keyed by attribute KEY (slugified name), never by display name.
- Stock states derive from the count (>3 in stock, 1–3 low, 0 out). Prices are USD. US shipping only; products with ca_legal=false cannot ship to California.
- Orders move forward only: PAID → PREPARING → PACKED → SHIPPED (needs carrier + tracking) → DELIVERED.

Working rules:
1. Start unfamiliar tasks with get_store_overview so you use real slugs, brand names and attribute keys.
2. Prepare the ground in order: section exists → brand exists → attributes exist → then create the product. Create what is missing yourself.
3. When you create a product, fill every attribute the template has (research-quality realistic spec values for the real-world product if the admin didn't specify), write a terse, factual description in the store's voice (plain verbs, measured facts, no marketing fluff), and attach the product's REAL photo with set_product_image. Illustrations, drawings or generated art are never acceptable — only an actual photograph of the exact model and colorway. Find the photo yourself, in this order: (a) an image URL the admin pasted; (b) search_product_images (direct image hits) if that integration is connected; (c) web_search for the official product page (always available), then fetch_page it and use its og:image candidate; (d) fetch_page a manufacturer/retailer URL you already know. Prefer studio product photos on a clean WHITE or transparent background (manufacturer-catalog style) — the storefront shows photos on a white well, so dark or lifestyle backgrounds look out of place; if your best candidate has a dark background, look for a white-background alternative first. set_product_image is the verifier — it downloads and checks the actual file, so never claim a photo was set unless it returned ok. If ~4 attempts all fail, finish the rest of the product anyway, say the photo is missing, and ask the admin to paste a direct image URL (right-click the photo → "Copy image address").
4. Never invent prices or stock counts without telling the admin what you assumed. If the admin gave no price, ask instead of guessing.
5. Destructive or irreversible things (unpublishing, cancelling orders) — confirm with the admin first unless they explicitly asked.
6. If a tool returns an error, fix the cause (e.g. missing brand) and retry once; otherwise report exactly what failed.
7. Reply in the language the admin writes in. Be brief: say what you did, list anything you assumed, and stop.
8. The store notebook at the end of this prompt is distilled experience from earlier sessions — possibly under a different model. Treat it as ground truth about how this store works. Whenever you learn something durable (a store convention, an admin preference, a mistake you made and its fix), record ONE terse line with save_note so no future session repeats the mistake. Never save one-off facts or duplicates.`;

type ClientMessage = { role: "user" | "assistant"; content: string };
type Step = { name: string; summary: string };

// One POST = ONE model round (a completion plus its tool calls). The client
// immediately posts the returned run state back to continue, so no single
// request outlives a serverless execution limit no matter how long the whole
// task runs — and the admin sees each round's steps as they land.
type RunState = { orMessages: ORMessage[]; round: number; steps: Step[] };

// Reuse the caller's conversation when it's really theirs; otherwise start a
// fresh one titled after the first instruction.
async function resolveConversation(
  adminId: string,
  requestedId: unknown,
  firstMessage: string
): Promise<string> {
  if (typeof requestedId === "string" && requestedId) {
    const existing = await prisma.assistantConversation.findFirst({
      where: { id: requestedId, adminId },
      select: { id: true },
    });
    if (existing) return existing.id;
  }
  const created = await prisma.assistantConversation.create({
    data: { adminId, title: firstMessage.slice(0, 80) },
  });
  return created.id;
}

function validRun(run: unknown): run is RunState {
  if (typeof run !== "object" || run === null) return false;
  const r = run as RunState;
  return (
    Array.isArray(r.orMessages) &&
    r.orMessages.length > 0 &&
    r.orMessages.length <= 400 &&
    typeof r.round === "number" &&
    r.round >= 1 &&
    r.round <= MAX_TOOL_ROUNDS &&
    Array.isArray(r.steps) &&
    r.steps.length <= 200
  );
}

async function persistAssistantTurn(
  conversationId: string,
  content: string,
  steps: Step[],
  error: boolean
): Promise<void> {
  try {
    await prisma.assistantMessage.create({
      data: {
        conversationId,
        role: "assistant",
        content,
        steps: steps as unknown as Prisma.InputJsonValue,
        error,
      },
    });
    await prisma.assistantConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  } catch {
    // history is best-effort — the answer already reached the admin
  }
}

export async function POST(request: Request) {
  const session = await readAdminSession();
  if (!session || session.stage !== "full") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const config = await assistantConfig();
  if (!config.apiKey) {
    return NextResponse.json(
      { error: "No OpenRouter key yet — add one under Admin → Integrations." },
      { status: 503 }
    );
  }
  const apiKey = config.apiKey;

  try {
    // Generous window: every round of a task is one request.
    await rateLimit({ key: `assistant:${session.adminId}`, max: 150, windowSeconds: 600 });
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: e.message }, { status: 429 });
    }
    throw e;
  }

  let body: { messages?: ClientMessage[]; conversationId?: unknown; run?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const history = (body.messages ?? [])
    .filter(
      (m): m is ClientMessage =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.length > 0
    )
    .slice(-MAX_HISTORY)
    .map((m) => ({ ...m, content: m.content.slice(0, 8000) }));
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return NextResponse.json({ error: "Send a user message." }, { status: 400 });
  }
  const lastUserMessage = history[history.length - 1].content;

  const notes = await readNotes();
  const systemMessage: ORMessage = {
    role: "system",
    content: `${SYSTEM_PROMPT}\n\nStore notebook (lessons carried across sessions and models):\n${formatNotebook(notes)}`,
  };

  let conversationId: string;
  let run: RunState;
  if (body.run !== undefined) {
    // Continuation — the conversation must already exist and be the caller's.
    if (!validRun(body.run) || typeof body.conversationId !== "string") {
      return NextResponse.json({ error: "Invalid run state." }, { status: 400 });
    }
    const owned = await prisma.assistantConversation.findFirst({
      where: { id: body.conversationId, adminId: session.adminId },
      select: { id: true },
    });
    if (!owned) return NextResponse.json({ error: "Invalid run state." }, { status: 400 });
    conversationId = owned.id;
    run = body.run;
    // The system prompt is always rebuilt server-side, never trusted from the wire.
    run.orMessages[0] = systemMessage;
  } else {
    conversationId = await resolveConversation(session.adminId, body.conversationId, lastUserMessage);
    await prisma.assistantMessage.create({
      data: { conversationId, role: "user", content: lastUserMessage },
    });
    run = { orMessages: [systemMessage, ...history], round: 0, steps: [] };
  }

  try {
    const { content, toolCalls } = await chatCompletion({
      messages: run.orMessages,
      tools: TOOL_DEFS,
      config: { apiKey, model: config.model },
    });

    if (toolCalls.length === 0 || run.round >= MAX_TOOL_ROUNDS) {
      const reply =
        content ??
        (run.round >= MAX_TOOL_ROUNDS
          ? "I hit the per-message action limit — tell me to continue and I'll pick up where I stopped."
          : "");
      await persistAssistantTurn(conversationId, reply, run.steps, false);
      return NextResponse.json({ done: true, conversationId, reply, steps: run.steps });
    }

    run.orMessages.push({ role: "assistant", content, tool_calls: toolCalls });
    for (const call of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
      } catch {
        const summary = `✗ ${call.function.name}: bad arguments`;
        run.steps.push({ name: call.function.name, summary });
        run.orMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({ error: "Arguments were not valid JSON." }),
        });
        continue;
      }
      const { result, summary } = await executeTool(session, call.function.name, args);
      run.steps.push({ name: call.function.name, summary });
      run.orMessages.push({ role: "tool", tool_call_id: call.id, content: result });
    }

    return NextResponse.json({
      done: false,
      conversationId,
      steps: run.steps,
      run: { orMessages: run.orMessages, round: run.round + 1, steps: run.steps },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "The assistant hit an unexpected error.";
    await persistAssistantTurn(conversationId, message, run.steps, true);
    return NextResponse.json(
      { error: message, conversationId, steps: run.steps },
      { status: 502 }
    );
  }
}
