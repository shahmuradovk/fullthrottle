"use client";

import { useActionState, useState } from "react";
import {
  createAttributeAction,
  deleteAttributeAction,
  updateAttributeAction,
} from "./actions";
import { Button } from "@/components/ui/button";

export type AttributeRow = {
  id: string;
  key: string;
  name: string;
  type: string;
  options: string[];
  unit: string;
  filterable: boolean;
  position: number;
};

const TYPE_LABELS: Record<string, string> = {
  SELECT: "select",
  MULTISELECT: "multiselect",
  NUMBER: "number",
  TEXT: "text",
  BOOLEAN: "boolean",
};

const filterControl = (type: string): string =>
  type === "NUMBER" ? "range" : type === "BOOLEAN" ? "yes / no" : "checkbox";

function AttributeEditor({ attr }: { attr: AttributeRow }) {
  const [state, formAction, pending] = useActionState(updateAttributeAction, null);
  const hasOptions = attr.type === "SELECT" || attr.type === "MULTISELECT";
  return (
    <form
      action={formAction}
      className="grid grid-cols-[32px_1fr_110px_80px_1fr_90px_110px_auto] items-center gap-2.5 border-b border-line px-4 py-2.5 max-lg:grid-cols-2 max-lg:gap-2"
    >
      <span className="font-mono text-[11px] text-accent max-lg:hidden">
        {String(attr.position + 1).padStart(2, "0")}
      </span>
      <input type="hidden" name="attributeId" value={attr.id} />
      <div>
        <label htmlFor={`name-${attr.id}`} className="sr-only">
          Label for {attr.name}
        </label>
        <input
          id={`name-${attr.id}`}
          name="name"
          defaultValue={attr.name}
          className="w-full rounded-1 border border-line bg-surface px-2 py-1.5 text-sm text-ink"
        />
      </div>
      <span className="rounded-1 border border-line bg-bg px-2 py-1.5 font-mono text-xs text-ink-secondary">
        {TYPE_LABELS[attr.type] ?? attr.type.toLowerCase()}
      </span>
      <div>
        <label htmlFor={`unit-${attr.id}`} className="sr-only">
          Unit for {attr.name}
        </label>
        <input
          id={`unit-${attr.id}`}
          name="unit"
          defaultValue={attr.unit}
          placeholder="—"
          disabled={attr.type !== "NUMBER"}
          className="w-full rounded-1 border border-line bg-surface px-2 py-1.5 font-mono text-xs text-ink disabled:opacity-40"
        />
      </div>
      <div>
        <label htmlFor={`options-${attr.id}`} className="sr-only">
          Options for {attr.name}
        </label>
        <input
          id={`options-${attr.id}`}
          name="options"
          defaultValue={attr.options.join(", ")}
          placeholder={hasOptions ? "Comma-separated" : "—"}
          disabled={!hasOptions}
          className="w-full rounded-1 border border-line bg-surface px-2 py-1.5 text-xs text-ink disabled:opacity-40"
        />
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-xs text-ink">
        <input
          type="checkbox"
          name="filterable"
          defaultChecked={attr.filterable}
          className="accent-(--color-accent)"
        />
        Filter
      </label>
      <span className="font-mono text-xs text-ink-secondary max-lg:hidden">
        {attr.filterable ? filterControl(attr.type) : "—"}
      </span>
      <div className="flex items-center justify-end gap-2.5">
        {state?.error && (
          <span role="alert" className="text-xs text-error">
            {state.error}
          </span>
        )}
        <Button type="submit" size="small" variant="secondary" disabled={pending}>
          Save
        </Button>
        <button
          type="submit"
          formAction={deleteAttributeAction}
          className="cursor-pointer border-none bg-transparent p-0 text-xs text-error hover:underline"
        >
          Delete
        </button>
      </div>
    </form>
  );
}

function NewAttributeForm({ sectionId }: { sectionId: string }) {
  const [state, formAction, pending] = useActionState(createAttributeAction, null);
  const [type, setType] = useState("SELECT");
  const hasOptions = type === "SELECT" || type === "MULTISELECT";
  return (
    <form
      action={formAction}
      className="mt-4 flex flex-wrap items-end gap-3 rounded-1 border border-line bg-surface p-4"
    >
      <input type="hidden" name="sectionId" value={sectionId} />
      <div className="flex flex-col gap-1">
        <label htmlFor="attr-name" className="type-label text-ink">
          Name
        </label>
        <input
          id="attr-name"
          name="name"
          placeholder="e.g. Visor type"
          className="w-44 rounded-1 border border-line bg-surface px-2.5 py-2 text-sm text-ink placeholder:text-ink-secondary"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="attr-type" className="type-label text-ink">
          Type
        </label>
        <select
          id="attr-type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-1 border border-line bg-surface px-2.5 py-2 text-sm text-ink"
        >
          <option value="SELECT">Select — one option</option>
          <option value="MULTISELECT">Multi-select</option>
          <option value="NUMBER">Number</option>
          <option value="TEXT">Text</option>
          <option value="BOOLEAN">Yes / No</option>
        </select>
      </div>
      {hasOptions && (
        <div className="flex min-w-52 flex-1 flex-col gap-1">
          <label htmlFor="attr-options" className="type-label text-ink">
            Options
          </label>
          <input
            id="attr-options"
            name="options"
            placeholder="Clear, Tinted, Iridium"
            className="rounded-1 border border-line bg-surface px-2.5 py-2 text-sm text-ink placeholder:text-ink-secondary"
          />
        </div>
      )}
      {type === "NUMBER" && (
        <div className="flex flex-col gap-1">
          <label htmlFor="attr-unit" className="type-label text-ink">
            Unit
          </label>
          <input
            id="attr-unit"
            name="unit"
            placeholder="mm"
            className="w-20 rounded-1 border border-line bg-surface px-2.5 py-2 font-mono text-sm text-ink placeholder:text-ink-secondary"
          />
        </div>
      )}
      <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          name="filterable"
          defaultChecked
          className="accent-(--color-accent)"
        />
        Show as a filter in the store
      </label>
      <Button type="submit" size="small" disabled={pending}>
        Add attribute
      </Button>
      {state?.error && (
        <p role="alert" className="w-full text-[13px] text-error">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function AttributesManager({
  sectionId,
  attributes,
}: {
  sectionId: string;
  attributes: AttributeRow[];
}) {
  return (
    <div>
      <div className="rounded-1 border border-line bg-surface">
        <div className="grid grid-cols-[32px_1fr_110px_80px_1fr_90px_110px_auto] gap-2.5 border-b-[1.5px] border-ink px-4 py-2.5 max-lg:hidden">
          {["", "Label", "Type", "Unit", "Options", "Filterable", "Filter as", ""].map(
            (h, i) => (
              <span key={i} className="type-label text-ink-secondary">
                {h}
              </span>
            )
          )}
        </div>
        {attributes.length === 0 && (
          <p className="px-4 py-6 text-[13px] text-ink-secondary">
            No attributes in this section yet. Add the first one below — the storefront
            filters, the spec table and the product form all update themselves.
          </p>
        )}
        {attributes.map((a) => (
          <AttributeEditor key={a.id} attr={a} />
        ))}
      </div>
      <NewAttributeForm sectionId={sectionId} />
      <div className="mt-3 flex flex-wrap gap-6 text-[13px] text-ink-secondary">
        <span>Filterable attributes appear on the storefront sidebar automatically.</span>
        <span>Every attribute becomes a spec row and a product-form field. Nothing else to wire.</span>
      </div>
    </div>
  );
}
