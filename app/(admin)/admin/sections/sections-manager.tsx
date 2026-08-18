"use client";

import { useActionState } from "react";
import {
  addBrandAction,
  createSectionAction,
  deleteSectionAction,
  removeBrandAction,
  updateSectionTaglineAction,
} from "./actions";
import { Button } from "@/components/ui/button";

export type SectionRow = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  attributeCount: number;
  productCount: number;
  brands: { id: string; name: string; productCount: number }[];
};

function DeleteSectionForm({ sectionId }: { sectionId: string }) {
  const [state, formAction, pending] = useActionState(deleteSectionAction, null);
  return (
    <form action={formAction} className="flex items-center gap-3">
      {state?.error && (
        <span role="alert" className="text-xs text-error">
          {state.error}
        </span>
      )}
      <input type="hidden" name="sectionId" value={sectionId} />
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer border-none bg-transparent p-0 text-[13px] text-error hover:underline"
      >
        Delete section
      </button>
    </form>
  );
}

function RemoveBrandForm({ brandId, name }: { brandId: string; name: string }) {
  const [state, formAction, pending] = useActionState(removeBrandAction, null);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="brandId" value={brandId} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Remove brand ${name}`}
        className="cursor-pointer border-none bg-transparent p-0 text-ink-secondary hover:text-error"
      >
        ×
      </button>
      {state?.error && (
        <span role="alert" className="text-xs text-error">
          {state.error}
        </span>
      )}
    </form>
  );
}

export function SectionsManager({ sections }: { sections: SectionRow[] }) {
  const [createState, createAction, createPending] = useActionState(
    createSectionAction,
    null
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="font-display text-[28px] font-bold text-ink">
          SECTIONS AND BRANDS
        </h1>
        <form action={createAction} className="flex items-center gap-2">
          <label htmlFor="new-section" className="sr-only">
            New section name
          </label>
          <input
            id="new-section"
            name="name"
            placeholder="e.g. Moto Gloves"
            className="w-44 rounded-1 border border-line bg-surface px-2.5 py-2 text-sm text-ink placeholder:text-ink-secondary"
          />
          <Button type="submit" size="small" disabled={createPending}>
            Add section
          </Button>
        </form>
      </div>
      {createState?.error && (
        <p role="alert" className="mb-3 text-[13px] text-error">
          {createState.error}
        </p>
      )}

      {sections.map((s) => (
        <section key={s.id} className="mb-4 rounded-1 border border-line bg-surface">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-4 py-3">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-base font-semibold text-ink">{s.name}</span>
              <span className="font-mono text-[11px] uppercase text-ink-secondary">
                /{s.slug} · {s.attributeCount} attributes · {s.productCount} products
              </span>
            </div>
            <DeleteSectionForm sectionId={s.id} />
          </div>
          <div className="flex flex-col gap-3 px-4 py-3.5">
            <form
              action={updateSectionTaglineAction}
              className="flex max-w-[520px] items-center gap-2"
            >
              <input type="hidden" name="sectionId" value={s.id} />
              <label htmlFor={`tagline-${s.id}`} className="sr-only">
                Tagline for {s.name}
              </label>
              <input
                id={`tagline-${s.id}`}
                name="tagline"
                defaultValue={s.tagline}
                placeholder="Short tagline shown on the home page"
                className="flex-1 rounded-1 border border-line bg-surface px-2.5 py-2 text-sm text-ink placeholder:text-ink-secondary"
              />
              <Button type="submit" size="small" variant="secondary">
                Save
              </Button>
            </form>
            <div className="flex flex-wrap items-center gap-2">
              {s.brands.length === 0 && (
                <span className="text-[13px] text-ink-secondary">
                  No brands yet. Add the first one below.
                </span>
              )}
              {s.brands.map((b) => (
                <span
                  key={b.id}
                  className="inline-flex items-center gap-2 rounded-1 border border-line px-2.5 py-1.5 font-mono text-xs text-ink"
                >
                  {b.name}
                  <RemoveBrandForm brandId={b.id} name={b.name} />
                </span>
              ))}
              <form action={addBrandAction} className="flex items-center gap-2">
                <input type="hidden" name="sectionId" value={s.id} />
                <label htmlFor={`brand-${s.id}`} className="sr-only">
                  New brand for {s.name}
                </label>
                <input
                  id={`brand-${s.id}`}
                  name="name"
                  placeholder="Brand name"
                  className="w-36 rounded-1 border border-line bg-surface px-2.5 py-1.5 text-[13px] text-ink placeholder:text-ink-secondary"
                />
                <Button type="submit" size="small" variant="secondary">
                  Add brand
                </Button>
              </form>
            </div>
          </div>
        </section>
      ))}

      <p className="text-[13px] text-ink-secondary">
        A new section starts with an empty attribute template. Products can’t be added
        until it has at least one attribute.
      </p>
    </div>
  );
}
