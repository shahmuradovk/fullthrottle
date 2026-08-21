import { requireAdmin } from "@/lib/admin/guard";
import { assistantConfigured, assistantModel } from "@/lib/assistant/openrouter";
import { AssistantChat } from "./assistant-chat";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  await requireAdmin();

  if (!assistantConfigured()) {
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
          <dl className="mt-4 flex flex-col gap-2.5 border-t border-line pt-4">
            <div className="flex gap-3 text-sm">
              <dt className="type-label w-[150px] shrink-0 text-ink-secondary">To enable</dt>
              <dd className="m-0 font-mono text-xs text-ink">
                Set OPENROUTER_API_KEY (openrouter.ai → Keys) and redeploy
              </dd>
            </div>
            <div className="flex gap-3 text-sm">
              <dt className="type-label w-[150px] shrink-0 text-ink-secondary">Model</dt>
              <dd className="m-0 font-mono text-xs text-ink">
                {assistantModel()} · override with OPENROUTER_MODEL
              </dd>
            </div>
          </dl>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-[28px] font-bold text-ink">ASSISTANT</h1>
        <span className="font-mono text-[11px] uppercase text-ink-secondary">
          {assistantModel()} · via OpenRouter
        </span>
      </div>
      <AssistantChat />
    </div>
  );
}
