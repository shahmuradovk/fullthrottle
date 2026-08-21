import { requireOwner } from "@/lib/admin/guard";
import {
  assistantConfig,
  listOpenRouterModels,
  DEFAULT_MODEL,
  type ORModelOption,
} from "@/lib/assistant/openrouter";
import { imageSearchConfig } from "@/lib/assistant/web";
import { IntegrationsForm } from "./integrations-form";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  await requireOwner();
  const config = await assistantConfig();
  const search = await imageSearchConfig();

  // The model catalog needs no auth, but only matters once a key exists.
  let models: ORModelOption[] | null = null;
  if (config.apiKey) {
    try {
      models = await listOpenRouterModels();
    } catch {
      models = null; // the form falls back to a free-text slug input
    }
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-[28px] font-bold text-ink">INTEGRATIONS</h1>
      <p className="mb-5 max-w-[560px] text-sm text-ink-secondary">
        Connections the store depends on. Keys are verified before they&rsquo;re
        stored, kept encrypted, and every change lands in the audit log.
      </p>
      <IntegrationsForm
        keySource={config.keySource}
        keyHint={config.keyHint}
        model={config.model}
        modelSource={config.modelSource}
        defaultModel={DEFAULT_MODEL}
        models={models}
        searchSource={search.source}
      />
    </div>
  );
}
