import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { assistantConfig } from "@/lib/assistant/openrouter";
import { prisma } from "@/lib/db";
import { AssistantChat } from "./assistant-chat";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const session = await requireAdmin();
  const config = await assistantConfig();

  if (!config.apiKey) {
    return (
      <div>
        <h1 className="mb-4 font-display text-[28px] font-bold text-ink">ASSISTANT</h1>
        <div className="max-w-[640px] rounded-1 border border-line bg-surface p-6">
          <div className="mb-3 flex items-center gap-2.5">
            <h2 className="font-display text-[22px] font-semibold text-ink">
              AI ADMIN ASSISTANT
            </h2>
            <span className="rounded-1 border border-dashed border-ink-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-secondary">
              Not configured
            </span>
          </div>
          <p className="max-w-[520px] text-sm leading-relaxed text-ink-secondary">
            The assistant talks to a Claude model through OpenRouter and does catalog
            and order work on your instruction — everything role-checked and
            audit-logged under your account.
          </p>
          <p className="mt-4 border-t border-line pt-4 text-sm text-ink">
            {session.role === "OWNER" ? (
              <>
                Connect your OpenRouter key under{" "}
                <Link href="/admin/integrations" className="underline underline-offset-[3px]">
                  Integrations
                </Link>{" "}
                — it takes a minute and you can pick the model there too.
              </>
            ) : (
              <>Ask the store owner to connect OpenRouter under Admin → Integrations.</>
            )}
          </p>
        </div>
      </div>
    );
  }

  // The latest conversation comes back on every visit — history lives in the
  // database, so a reload (or a model switch in Integrations) loses nothing.
  const conversation = await prisma.assistantConversation.findFirst({
    where: { adminId: session.adminId },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 60 } },
  });
  const initialMessages =
    conversation?.messages.map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
      steps: (m.steps as { name: string; summary: string }[] | null) ?? undefined,
      error: m.error || undefined,
    })) ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-[28px] font-bold text-ink">ASSISTANT</h1>
        <span className="font-mono text-[11px] uppercase text-ink-secondary">
          {config.model} · via OpenRouter
        </span>
      </div>
      <AssistantChat
        initialConversationId={conversation?.id ?? null}
        initialMessages={initialMessages}
      />
    </div>
  );
}
