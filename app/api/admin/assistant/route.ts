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
3. When you create a product, fill every attribute the template has (research-quality realistic spec values for the real-world product if the admin didn't specify), write a terse, factual description in the store's voice (plain verbs, measured facts, no marketing fluff), and attach the product's REAL photo with set_product_image. Illustrations, drawings or generated art are never acceptable — only an actual photograph of the exact model and colorway, via a direct https image URL (manufacturer product/press photo or a major retailer's image CDN). If the admin pasted an image URL, use it. If a URL fails to download, try a different source (up to ~3 attempts total); if none works, finish the rest of the product anyway, tell the admin the photo is still missing, and ask them to paste a direct image URL (right-click the photo in their browser → "Copy image address"). Never claim a photo was set unless set_product_image returned ok.
4. Never invent prices or stock counts without telling the admin what you assumed. If the admin gave no price, ask instead of guessing.
5. Destructive or irreversible things (unpublishing, cancelling orders) — confirm with the admin first unless they explicitly asked.
6. If a tool returns an error, fix the cause (e.g. missing brand) and retry once; otherwise report exactly what failed.
7. Reply in the language the admin writes in. Be brief: say what you did, list anything you assumed, and stop.
8. The store notebook at the end of this prompt is distilled experience from earlier sessions — possibly under a different model. Treat it as ground truth about how this store works. Whenever you learn something durable (a store convention, an admin preference, a mistake you made and its fix), record ONE terse line with save_note so no future session repeats the mistake. Never save one-off facts or duplicates.`;

type ClientMessage = { role: "user" | "assistant"; content: string };

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
    await rateLimit({ key: `assistant:${session.adminId}`, max: 30, windowSeconds: 600 });
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: e.message }, { status: 429 });
    }
    throw e;
  }

  let body: { messages?: ClientMessage[]; conversationId?: unknown };
  try {
    body = (await request.json()) as { messages?: ClientMessage[]; conversationId?: unknown };
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
  const conversationId = await resolveConversation(
    session.adminId,
    body.conversationId,
    lastUserMessage
  );
  await prisma.assistantMessage.create({
    data: { conversationId, role: "user", content: lastUserMessage },
  });

  const notes = await readNotes();
  const messages: ORMessage[] = [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}\n\nStore notebook (lessons carried across sessions and models):\n${formatNotebook(notes)}`,
    },
    ...history,
  ];

  // The whole run is streamed as NDJSON (step / reply / error / ping events).
  // Bytes flow from the first moment and between model rounds, so a long
  // multi-tool task neither hits the platform's response timeout nor leaves
  // the admin staring at a spinner — steps render as they happen.
  const encoder = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          closed = true; // client went away — keep executing, stop writing
        }
      };
      const heartbeat = setInterval(() => send({ type: "ping" }), 8000);
      send({ type: "meta", conversationId });

      // Mirrors of what was streamed, persisted as the assistant turn so the
      // conversation survives reloads and future model switches inherit it.
      const stepLog: { name: string; summary: string }[] = [];
      let replyText = "";
      let replyError = false;

      try {
        for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
          const { content, toolCalls } = await chatCompletion({
            messages,
            tools: TOOL_DEFS,
            config: { apiKey, model: config.model },
          });

          if (toolCalls.length === 0 || round === MAX_TOOL_ROUNDS) {
            replyText =
              content ??
              (round === MAX_TOOL_ROUNDS
                ? "I hit the per-message action limit — tell me to continue and I'll pick up where I stopped."
                : "");
            send({ type: "reply", reply: replyText });
            break;
          }

          messages.push({ role: "assistant", content, tool_calls: toolCalls });

          for (const call of toolCalls) {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
            } catch {
              messages.push({
                role: "tool",
                tool_call_id: call.id,
                content: JSON.stringify({ error: "Arguments were not valid JSON." }),
              });
              const summary = `✗ ${call.function.name}: bad arguments`;
              stepLog.push({ name: call.function.name, summary });
              send({ type: "step", name: call.function.name, summary });
              continue;
            }
            const { result, summary } = await executeTool(session, call.function.name, args);
            stepLog.push({ name: call.function.name, summary });
            send({ type: "step", name: call.function.name, summary });
            messages.push({ role: "tool", tool_call_id: call.id, content: result });
          }
        }
      } catch (e) {
        replyText = e instanceof Error ? e.message : "The assistant hit an unexpected error.";
        replyError = true;
        send({ type: "error", error: replyText });
      } finally {
        clearInterval(heartbeat);
        try {
          await prisma.assistantMessage.create({
            data: {
              conversationId,
              role: "assistant",
              content: replyText,
              steps: stepLog as unknown as Prisma.InputJsonValue,
              error: replyError,
            },
          });
          await prisma.assistantConversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });
        } catch {
          // history is best-effort — the streamed answer already reached the admin
        }
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed by the runtime
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-transform",
    },
  });
}
