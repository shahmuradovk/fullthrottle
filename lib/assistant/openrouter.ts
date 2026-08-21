import { appUrl } from "@/lib/app-url";

// OpenRouter chat-completions client (OpenAI-compatible wire format), used to
// reach a Claude model for the admin assistant. Swapping to the direct
// Anthropic API later means replacing this file only — the tool layer and UI
// don't know which provider is underneath.

export type ORToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type ORMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ORToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type ORToolDef = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export function assistantConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export function assistantModel(): string {
  return process.env.OPENROUTER_MODEL ?? "anthropic/claude-opus-5";
}

export async function chatCompletion(params: {
  messages: ORMessage[];
  tools: ORToolDef[];
}): Promise<{ content: string | null; toolCalls: ORToolCall[] }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set.");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": appUrl(),
      "X-Title": "Fullthrottle Admin Assistant",
    },
    body: JSON.stringify({
      model: assistantModel(),
      messages: params.messages,
      tools: params.tools,
      tool_choice: "auto",
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    let detail = body.slice(0, 300);
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string } };
      if (parsed.error?.message) detail = parsed.error.message;
    } catch {
      // keep raw slice
    }
    throw new Error(`OpenRouter request failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as {
    choices?: {
      message?: { content?: string | null; tool_calls?: ORToolCall[] };
    }[];
  };
  const message = data.choices?.[0]?.message;
  return {
    content: message?.content ?? null,
    toolCalls: message?.tool_calls ?? [],
  };
}
