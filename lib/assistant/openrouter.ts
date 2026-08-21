import { appUrl } from "@/lib/app-url";
import { getSetting, openSecret } from "@/lib/settings";

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

export const DEFAULT_MODEL = "anthropic/claude-opus-5";

// Where each value came from, in precedence order: the Integrations screen
// beats the environment; the model additionally falls back to the default.
export const KEY_SETTING = "assistant.openrouter_key";
export const MODEL_SETTING = "assistant.model";

export type AssistantConfig = {
  apiKey: string | null;
  keySource: "panel" | "env" | null;
  keyHint: string | null; // last 4 characters, for display only
  model: string;
  modelSource: "panel" | "env" | "default";
};

export async function assistantConfig(): Promise<AssistantConfig> {
  const sealed = await getSetting(KEY_SETTING);
  const panelKey = sealed ? openSecret(sealed) : null;
  const envKey = process.env.OPENROUTER_API_KEY || null;
  const apiKey = panelKey ?? envKey;

  const panelModel = await getSetting(MODEL_SETTING);
  const envModel = process.env.OPENROUTER_MODEL || null;
  const model = panelModel ?? envModel ?? DEFAULT_MODEL;

  return {
    apiKey,
    keySource: panelKey ? "panel" : envKey ? "env" : null,
    keyHint: apiKey ? apiKey.slice(-4) : null,
    model,
    modelSource: panelModel ? "panel" : envModel ? "env" : "default",
  };
}

export async function chatCompletion(params: {
  messages: ORMessage[];
  tools: ORToolDef[];
  config: { apiKey: string; model: string };
}): Promise<{ content: string | null; toolCalls: ORToolCall[] }> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.config.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": appUrl(),
      "X-Title": "Fullthrottle Admin Assistant",
    },
    body: JSON.stringify({
      model: params.config.model,
      messages: params.messages,
      tools: params.tools,
      tool_choice: "auto",
      max_tokens: 2048,
    }),
    signal: AbortSignal.timeout(120_000),
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

// ── Integrations screen helpers ──────────────────────────────────────────────

// Proves a key is real before it's stored: /auth/key answers only for valid
// keys and costs nothing.
export async function verifyOpenRouterKey(
  key: string
): Promise<{ ok: true; label: string | null } | { ok: false; error: string }> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "OpenRouter rejected that key. Copy it again from openrouter.ai → Keys." };
    }
    if (!res.ok) {
      return { ok: false, error: `OpenRouter answered ${res.status} — try again in a minute.` };
    }
    const data = (await res.json()) as { data?: { label?: string } };
    return { ok: true, label: data.data?.label ?? null };
  } catch {
    return { ok: false, error: "Couldn't reach OpenRouter to verify the key. Try again." };
  }
}

export type ORModelOption = {
  id: string;
  name: string;
  pricePerMTokens: string | null; // "in $x / out $y" per million tokens
};

// The catalog endpoint is public. The assistant drives everything through
// tool calls, so only tool-capable models are offered.
export async function listOpenRouterModels(): Promise<ORModelOption[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`OpenRouter models request failed (${res.status}).`);
  const data = (await res.json()) as {
    data?: {
      id?: string;
      name?: string;
      pricing?: { prompt?: string; completion?: string };
      supported_parameters?: string[];
    }[];
  };
  const perM = (raw?: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    const dollars = n * 1_000_000;
    return dollars >= 10 ? dollars.toFixed(0) : dollars >= 1 ? dollars.toFixed(2) : dollars.toFixed(2);
  };
  const models = (data.data ?? [])
    .filter((m) => m.id && (m.supported_parameters ?? []).includes("tools"))
    .map((m) => {
      const input = perM(m.pricing?.prompt);
      const output = perM(m.pricing?.completion);
      return {
        id: m.id as string,
        name: m.name ?? (m.id as string),
        pricePerMTokens: input && output ? `in $${input} / out $${output}` : null,
      };
    });
  const rank = (id: string) =>
    id.startsWith("anthropic/") ? 0 : id.startsWith("openai/") ? 1 : id.startsWith("google/") ? 2 : 3;
  models.sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
  return models;
}
