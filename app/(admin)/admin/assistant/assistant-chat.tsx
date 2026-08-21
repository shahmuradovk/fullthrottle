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
    try {
      const res = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversationId,
          messages: next.map(({ role, content }) => ({ role, content })),
        }),
      });

      // Non-stream failures (not signed in, rate limit, unconfigured) are JSON.
      if (!res.ok || !res.body) {
        let message = "Something failed — try again.";
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          // non-JSON body — keep the generic message
        }
        setMessages([...next, { role: "assistant", content: message, error: true }]);
        return;
      }

      // The run streams as NDJSON — steps paint the moment each action lands.
      const steps: Step[] = [];
      let reply = "";
      let isError = false;
      let finished = false;
      const paint = () =>
        setMessages([
          ...next,
          { role: "assistant", content: reply, steps: [...steps], error: isError },
        ]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let event: {
            type?: string;
            name?: string;
            summary?: string;
            reply?: string;
            error?: string;
            conversationId?: string;
          };
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }
          if (event.type === "meta" && event.conversationId) {
            setConversationId(event.conversationId);
          } else if (event.type === "step") {
            steps.push({ name: event.name ?? "", summary: event.summary ?? "" });
            paint();
          } else if (event.type === "reply") {
            reply = event.reply ?? "";
            finished = true;
            paint();
          } else if (event.type === "error") {
            reply = event.error ?? "The assistant hit an unexpected error.";
            isError = true;
            finished = true;
            paint();
          }
        }
      }

      if (!finished) {
        // The connection was cut mid-run. Completed steps above already ran.
        reply = steps.length
          ? "The connection dropped mid-task — the steps above did run. Say “continue” and I'll pick up from there."
          : "Network hiccup — send that again.";
        isError = true;
        paint();
      }
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Network hiccup — send that again.", error: true },
      ]);
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
