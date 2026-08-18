"use client";

import { useActionState } from "react";
import { saveProductAction } from "./actions";
import { AttributeField } from "@/components/admin/attribute-field";
import { Button } from "@/components/ui/button";
import type { AttributeDef, AttributeValues } from "@/lib/attributes/types";

export type ProductFormData = {
  id?: string;
  brandId: string;
  name: string;
  sku: string;
  price: string; // dollars, e.g. "549.00"
  stock: string;
  supplierSku: string;
  description: string;
  active: boolean;
  values: AttributeValues;
  prop65: string;
  carbEoNumber: string;
  caLegal: boolean;
  hazmatClass: string;
  oversizeFreight: boolean;
};

const inputClass =
  "w-full rounded-1 border border-line bg-surface px-2.5 py-2 text-sm text-ink placeholder:text-ink-secondary disabled:opacity-40";

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="type-label text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}

export function ProductForm({
  sectionId,
  sectionName,
  brands,
  attributes,
  product,
  canEditPrice,
}: {
  sectionId: string;
  sectionName: string;
  brands: { id: string; name: string }[];
  attributes: AttributeDef[];
  product: ProductFormData | null;
  canEditPrice: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveProductAction, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="sectionId" value={sectionId} />
      {product?.id && <input type="hidden" name="productId" value={product.id} />}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[28px] font-bold uppercase text-ink">
          {product?.id ? "Edit product" : "New product"} — {sectionName}
        </h1>
        <div className="flex gap-2">
          <Button
            type="submit"
            name="publish"
            value="draft"
            variant="secondary"
            size="small"
            disabled={pending}
          >
            Save draft
          </Button>
          <Button type="submit" name="publish" value="publish" size="small" disabled={pending}>
            Publish product
          </Button>
        </div>
      </div>

      {state?.error && (
        <p role="alert" className="mb-3 text-[13px] text-error">
          {state.error}
        </p>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-3.5 rounded-1 border border-line bg-surface p-5">
          <p className="type-label border-b-[1.5px] border-ink pb-2 text-ink-secondary">
            Base — same for every section
          </p>
          <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
            <Field id="brandId" label="Brand">
              <select
                id="brandId"
                name="brandId"
                defaultValue={product?.brandId ?? ""}
                className={inputClass}
              >
                <option value="">— select —</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="name" label="Name">
              <input id="name" name="name" defaultValue={product?.name} className={inputClass} />
            </Field>
            <Field id="sku" label="SKU">
              <input
                id="sku"
                name="sku"
                defaultValue={product?.sku}
                className={`${inputClass} font-mono`}
              />
            </Field>
            <Field id="price" label={canEditPrice ? "Price (USD)" : "Price (USD) — managers only"}>
              <input
                id="price"
                name="price"
                inputMode="decimal"
                defaultValue={product?.price}
                disabled={!canEditPrice}
                className={`${inputClass} font-mono`}
              />
            </Field>
            <Field id="stock" label="Stock on hand">
              <input
                id="stock"
                name="stock"
                type="number"
                min={0}
                defaultValue={product?.stock ?? "0"}
                className={`${inputClass} font-mono`}
              />
            </Field>
            <Field id="supplierSku" label="Supplier SKU">
              <input
                id="supplierSku"
                name="supplierSku"
                placeholder="For the supplier sync"
                defaultValue={product?.supplierSku}
                className={`${inputClass} font-mono`}
              />
            </Field>
          </div>
          <Field id="description" label="Description">
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={product?.description}
              className={`${inputClass} resize-y`}
            />
          </Field>
          <p className="text-xs text-ink-secondary">
            Stock state is derived from the count: over 3 = in stock, 1–3 = low stock,
            0 = out of stock. Supplier-synced products show “Ships from supplier (2–4
            days)”.
          </p>

          <p className="type-label border-b-[1.5px] border-ink pb-2 pt-2 text-ink-secondary">
            US compliance
          </p>
          <Field id="prop65" label="Prop 65 warning (empty = not required)">
            <textarea
              id="prop65"
              name="prop65"
              rows={2}
              defaultValue={product?.prop65}
              className={`${inputClass} resize-y`}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
            <Field id="carbEoNumber" label="CARB EO number">
              <input
                id="carbEoNumber"
                name="carbEoNumber"
                placeholder="D-732-14"
                defaultValue={product?.carbEoNumber}
                className={`${inputClass} font-mono`}
              />
            </Field>
            <Field id="hazmatClass" label="Hazmat class">
              <input
                id="hazmatClass"
                name="hazmatClass"
                placeholder="battery, oil, aerosol…"
                defaultValue={product?.hazmatClass}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="caLegal"
                value="off-market"
                defaultChecked={product ? !product.caLegal : false}
                className="accent-(--color-accent)"
              />
              Not CA-legal — block shipping to California
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="oversizeFreight"
                defaultChecked={product?.oversizeFreight}
                className="accent-(--color-accent)"
              />
              Oversize freight
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-1 border border-line bg-surface p-5">
          <p className="type-label border-b-[1.5px] border-ink pb-2 text-accent">
            From the {sectionName} template — {attributes.length}{" "}
            {attributes.length === 1 ? "field" : "fields"}
          </p>
          {attributes
            .sort((a, b) => a.position - b.position)
            .map((def) => (
              <AttributeField key={def.key} def={def} value={product?.values[def.key]} />
            ))}
          <p className="text-xs text-ink-secondary">
            Add an attribute to the {sectionName} template and another field appears
            here — no release needed.
          </p>
        </div>
      </div>
    </form>
  );
}
