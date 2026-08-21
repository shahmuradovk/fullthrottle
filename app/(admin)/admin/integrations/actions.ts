"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/admin/guard";
import { writeAudit } from "@/lib/audit";
import { clientIp, rateLimit, RateLimitError } from "@/lib/rate-limit";
import { deleteSetting, sealSecret, setSetting } from "@/lib/settings";
import {
  DEFAULT_MODEL,
  KEY_SETTING,
  MODEL_SETTING,
  verifyOpenRouterKey,
} from "@/lib/assistant/openrouter";

export type IntegrationFormState = { error: string } | { ok: string } | null;

const MODEL_SLUG = /^[\w.:-]+\/[\w.:-]+$/;

export async function saveOpenRouterKeyAction(
  _prev: IntegrationFormState,
  formData: FormData
): Promise<IntegrationFormState> {
  const session = await requireOwner();
  try {
    await rateLimit({
      key: `integration-verify:${await clientIp()}`,
      max: 10,
      windowSeconds: 600,
    });
  } catch (e) {
    if (e instanceof RateLimitError) return { error: e.message };
    throw e;
  }

  const key = String(formData.get("key") ?? "").trim();
  if (!key) return { error: "Paste the key first." };

  // The key is stored only after OpenRouter itself confirms it works.
  const check = await verifyOpenRouterKey(key);
  if (!check.ok) return { error: check.error };

  await setSetting(KEY_SETTING, sealSecret(key));
  await writeAudit({
    actorId: session.adminId,
    action: "integration.openrouter.key",
    entity: "Setting",
    entityId: KEY_SETTING,
    after: { last4: key.slice(-4), label: check.label },
  });
  revalidatePath("/admin/integrations");
  return { ok: `Key verified and saved${check.label ? ` (${check.label})` : ""}.` };
}

export async function clearOpenRouterKeyAction(): Promise<void> {
  const session = await requireOwner();
  await deleteSetting(KEY_SETTING);
  await writeAudit({
    actorId: session.adminId,
    action: "integration.openrouter.key.remove",
    entity: "Setting",
    entityId: KEY_SETTING,
  });
  revalidatePath("/admin/integrations");
}

export async function saveModelAction(
  _prev: IntegrationFormState,
  formData: FormData
): Promise<IntegrationFormState> {
  const session = await requireOwner();
  const custom = String(formData.get("custom_model") ?? "").trim();
  const picked = String(formData.get("model") ?? "").trim();
  const model = custom || picked;
  if (!model) return { error: "Pick a model or type its slug." };
  if (!MODEL_SLUG.test(model)) {
    return { error: 'Model slugs look like "anthropic/claude-opus-5".' };
  }
  await setSetting(MODEL_SETTING, model);
  await writeAudit({
    actorId: session.adminId,
    action: "integration.assistant.model",
    entity: "Setting",
    entityId: MODEL_SETTING,
    after: { model },
  });
  revalidatePath("/admin/integrations");
  return { ok: `Assistant model set to ${model}.` };
}

export async function resetModelAction(): Promise<void> {
  const session = await requireOwner();
  await deleteSetting(MODEL_SETTING);
  await writeAudit({
    actorId: session.adminId,
    action: "integration.assistant.model.reset",
    entity: "Setting",
    entityId: MODEL_SETTING,
    after: { model: DEFAULT_MODEL },
  });
  revalidatePath("/admin/integrations");
}
