"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ORModelOption } from "@/lib/assistant/openrouter";
import {
  clearOpenRouterKeyAction,
  resetModelAction,
  saveModelAction,
  saveOpenRouterKeyAction,
  type IntegrationFormState,
} from "./actions";

function StateLine({ state }: { state: IntegrationFormState }) {
  if (!state) return null;
  const error = "error" in state;
  return (
    <p role={error ? "alert" : "status"} className={`text-[13px] ${error ? "text-error" : "text-accent"}`}>
      {error ? state.error : state.ok}
    </p>
  );
}

export function IntegrationsForm({
  keySource,
  keyHint,
  model,
  modelSource,
  defaultModel,
  models,
}: {
  keySource: "panel" | "env" | null;
  keyHint: string | null;
  model: string;
  modelSource: "panel" | "env" | "default";
  defaultModel: string;
  models: ORModelOption[] | null;
}) {
  const [keyState, keyAction, keyPending] = useActionState(saveOpenRouterKeyAction, null);
  const [modelState, modelAction, modelPending] = useActionState(saveModelAction, null);

  const groups: { label: string; test: (id: string) => boolean }[] = [
    { label: "Anthropic", test: (id) => id.startsWith("anthropic/") },
    { label: "OpenAI", test: (id) => id.startsWith("openai/") },
    { label: "Google", test: (id) => id.startsWith("google/") },
    { label: "Other providers", test: () => true },
  ];
  const grouped = models
    ? groups
        .map((g, i) => ({
          label: g.label,
          items: models.filter(
            (m) => g.test(m.id) && !groups.slice(0, i).some((prev) => prev.test(m.id))
          ),
        }))
        .filter((g) => g.items.length > 0)
    : null;

  return (
    <div className="flex max-w-[640px] flex-col gap-5">
      {/* ── OpenRouter key ── */}
      <section className="rounded-1 border border-line bg-surface p-6">
        <div className="mb-3 flex items-center gap-2.5">
          <h2 className="font-display text-[20px] font-semibold text-ink">OPENROUTER</h2>
          <span
            className={`rounded-1 border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] ${
              keySource ? "border-accent text-accent" : "border-dashed border-ink-secondary text-ink-secondary"
            }`}
          >
            {keySource ? "Connected" : "Not connected"}
          </span>
        </div>
        <p className="mb-4 text-[13px] leading-relaxed text-ink-secondary">
          Powers the AI assistant. Create a key at openrouter.ai → Keys, paste it
          here — it&rsquo;s checked against OpenRouter before anything is saved.
          {keySource === "panel" && keyHint && (
            <> Current key ends in <span className="font-mono text-ink">…{keyHint}</span> (saved here).</>
          )}
          {keySource === "env" && (
            <> Currently using the key from the hosting environment{keyHint ? (
              <> (ends in <span className="font-mono text-ink">…{keyHint}</span>)</>
            ) : null}; saving one here overrides it.</>
          )}
        </p>
        <form action={keyAction} className="flex flex-col gap-3">
          <Input
            id="or-key"
            name="key"
            type="password"
            label="API key"
            placeholder="sk-or-v1-…"
            autoComplete="off"
            required
          />
          <StateLine state={keyState} />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={keyPending}>
              {keyPending ? "Verifying…" : "Verify & save"}
            </Button>
          </div>
        </form>
        {keySource === "panel" && (
          <form action={clearOpenRouterKeyAction} className="mt-3 border-t border-line pt-3">
            <button
              type="submit"
              className="cursor-pointer border-none bg-transparent p-0 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-secondary underline underline-offset-[3px] hover:text-error"
            >
              Remove saved key
            </button>
          </form>
        )}
      </section>

      {/* ── Assistant model ── */}
      <section className="rounded-1 border border-line bg-surface p-6">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-[20px] font-semibold text-ink">ASSISTANT MODEL</h2>
          <span className="font-mono text-[11px] text-ink-secondary">
            {model}
            {modelSource === "default" && " · default"}
            {modelSource === "env" && " · from environment"}
          </span>
        </div>
        {!keySource ? (
          <p className="text-[13px] text-ink-secondary">Connect the OpenRouter key first.</p>
        ) : (
          <form action={modelAction} className="flex flex-col gap-3">
            {grouped ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="or-model" className="type-label text-ink-secondary">
                  Model (tool-capable only)
                </label>
                <select
                  id="or-model"
                  name="model"
                  defaultValue={models?.some((m) => m.id === model) ? model : defaultModel}
                  className="rounded-1 border border-line bg-bg px-3 py-2.5 text-sm text-ink outline-none"
                >
                  {grouped.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.items.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.id}
                          {m.pricePerMTokens ? ` — ${m.pricePerMTokens} per 1M tokens` : ""}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-[13px] text-ink-secondary">
                Couldn&rsquo;t load the model list right now — type the slug below instead.
              </p>
            )}
            <Input
              id="or-custom-model"
              name="custom_model"
              label="Or type any OpenRouter model slug"
              placeholder="leave empty to use the selection above"
              autoComplete="off"
            />
            <StateLine state={modelState} />
            <div className="flex items-center gap-4">
              <Button type="submit" disabled={modelPending}>
                {modelPending ? "Saving…" : "Save model"}
              </Button>
            </div>
          </form>
        )}
        {keySource && modelSource === "panel" && (
          <form action={resetModelAction} className="mt-3 border-t border-line pt-3">
            <button
              type="submit"
              className="cursor-pointer border-none bg-transparent p-0 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-secondary underline underline-offset-[3px] hover:text-ink"
            >
              Reset to default ({defaultModel})
            </button>
          </form>
        )}
      </section>

    </div>
  );
}
