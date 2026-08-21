"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Step = { name: string; summary: string };
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  steps?: Step[];
  error?: boolean;
};

const STARTERS = [
  "Add the AGV K1 S helmet — full face, fiberglass, DOT + ECE 22.06, 1,450 g, sizes S–XL, $329.95, 6 in stock. Attach its real photo too.",
  "Which products are low on stock?",
  "Create a Moto Gloves section with brands Alpinestars and Dainese, and a sensible attribute template.",
  "Show me the latest orders.",
];

export function AssistantChat({
  initialConversationId = null,
  initialMessages = [],
}: {
  initialConversationId?: string | null;
  initialMessages?: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setBusy(true);
    // One request = one model round; the server hands back a run state and we
    // immediately post it back to continue. No single request runs long enough
    // to hit a serverless timeout, and each round's steps paint on arrival.
    const clientHistory = next.map(({ role, content }) => ({ role, content }));
    let steps: Step[] = [];
    const paint = (content: string, error?: boolean) =>
      setMessages([
        ...next,
        { role: "assistant", content, steps: [...steps], error },
      ]);

    try {
      let payload: Record<string, unknown> = {
        conversationId,
        messages: clientHistory,
      };
      type RoundResponse = {
        done?: boolean;
        conversationId?: string;
        reply?: string;
        steps?: Step[];
        run?: unknown;
        error?: string;
      };
      for (let attempt = 0; ; ) {
        let data: RoundResponse | null = null;
        try {
          const res = await fetch("/api/admin/assistant", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          data = (await res.json()) as RoundResponse;
          if (data && !res.ok && !data.error) data = null; // killed mid-round
        } catch {
          data = null; // network blip or terminated function
        }

        if (!data) {
          if (attempt < 1) {
            // Same payload again — the server holds no run state, so a retry
            // is safe; the model recovers from any half-executed round.
            attempt++;
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue;
          }
          paint(
            steps.length
              ? "The connection dropped mid-task — the steps above did run. Say “continue” and I'll pick up from there."
              : "Network hiccup — send that again.",
            true
          );
          return;
        }

        if (Array.isArray(data.steps)) steps = data.steps;
        if (typeof data.conversationId === "string") setConversationId(data.conversationId);

        if (data.error) {
          paint(data.error, true);
          return;
        }
        if (data.done) {
          paint(data.reply ?? "");
          return;
        }

        paint(""); // progress so far, reply still cooking
        attempt = 0;
        payload = {
          conversationId: data.conversationId,
          messages: clientHistory,
          run: data.run,
        };
      }
    } catch {
      paint("Network hiccup — send that again.", true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-160px)] min-h-[420px] flex-col rounded-1 border border-line bg-surface">
      {messages.length > 0 && (
        <div className="flex items-center justify-between border-b border-line px-5 py-2">
          <span className="type-label text-ink-secondary">
            Conversation — saved automatically
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setMessages([]);
              setConversationId(null);
            }}
            className="cursor-pointer border-none bg-transparent p-0 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-secondary underline underline-offset-[3px] hover:text-ink disabled:opacity-50"
          >
            New chat
          </button>
        </div>
      )}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="type-label text-ink-secondary">Fiche AI-01 · Admin assistant</p>
            <p className="max-w-md text-sm text-ink-secondary">
              Give it a task — it knows the whole catalog, creates sections, brands,
              attributes and products (real product photos included), and moves
              orders. Every action runs under your account and lands in the audit
              log.
            </p>
            <div className="flex max-w-xl flex-wrap justify-center gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="cursor-pointer rounded-1 border border-line bg-bg px-3 py-2 text-left text-xs text-ink hover:border-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-1 border p-3.5",
                m.role === "user"
                  ? "self-end border-line bg-bg"
                  : m.error
                    ? "self-start border-error bg-error-bg"
                    : "self-start border-line bg-bg"
              )}
            >
              <p className="type-label mb-1.5 text-ink-secondary">
                {m.role === "user" ? "You" : "Assistant"}
              </p>
              {m.steps && m.steps.length > 0 && (
                <div className="mb-2 flex flex-col gap-1 border-b border-line pb-2">
                  {m.steps.map((s, j) => (
                    <p key={j} className="font-mono text-[11px] text-ink-secondary">
                      <span
                        className={s.summary.startsWith("✗") ? "text-error" : "text-accent"}
                      >
                        →
                      </span>{" "}
                      {s.summary}
                    </p>
                  ))}
                </div>
              )}
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {m.content}
              </p>
            </div>
          ))}
          {busy && (
            <p className="self-start font-mono text-xs text-ink-secondary">
              <span className="text-accent">→</span> working…
            </p>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2.5 border-t border-line p-3.5"
      >
        <label htmlFor="assistant-input" className="sr-only">
          Task for the assistant
        </label>
        <textarea
          id="assistant-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={2}
          placeholder='e.g. "New product: Shoei Neotec 3 modular, $749.99, 4 in stock — add it with its photo."'
          className="flex-1 resize-none rounded-1 border border-line bg-bg px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-secondary"
        />
        <Button type="submit" size="small" disabled={busy || !input.trim()}>
          {busy ? "Working…" : "Send"}
        </Button>
      </form>
    </div>
  );
}
