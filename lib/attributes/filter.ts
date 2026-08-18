import type { AttributeDef, AttributeValues } from "./types";
import { getAvailability } from "@/lib/supplier/availability";

// URL-driven catalog filtering. Filter state lives in the query string so
// listing pages are shareable and server-renderable (engineering brief §4).
//
// Param scheme:
//   f_<key>=Val1~Val2        SELECT / MULTISELECT / BOOLEAN (Yes~No)
//   f_<key>_min / f_<key>_max NUMBER ranges
//   brand=slug~slug          brand facet
//   price_min / price_max    dollars
//   avail=in~supplier~hide-out
//   sort=name|price-asc|price-desc   page=N

export type ProductLike = {
  id: string;
  brandId: string;
  priceCents: number;
  values: AttributeValues;
  supplySource: "MANUAL" | "SUPPLIER";
  stock: number;
  supplierStock?: number | null;
};

export type FilterState = {
  attr: Record<string, string[]>; // key → selected option labels (Yes/No for boolean)
  range: Record<string, { min?: number; max?: number }>; // key → numeric range
  brands: string[]; // brand ids resolved from slugs by the caller
  price: { min?: number; max?: number }; // dollars
  avail: string[]; // "in" | "supplier" | "hide-out"
  sort: "name" | "price-asc" | "price-desc";
  page: number;
};

export type SearchParamsLike = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

const splitVals = (v: string | undefined): string[] =>
  v ? v.split("~").filter(Boolean) : [];

const toNum = (v: string | undefined): number | undefined => {
  if (v === undefined || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export function parseFilters(
  params: SearchParamsLike,
  attributes: AttributeDef[],
  brandIdBySlug: Record<string, string>
): FilterState {
  const attr: Record<string, string[]> = {};
  const range: Record<string, { min?: number; max?: number }> = {};

  for (const def of attributes) {
    if (!def.filterable) continue;
    if (def.type === "NUMBER") {
      const min = toNum(first(params[`f_${def.key}_min`]));
      const max = toNum(first(params[`f_${def.key}_max`]));
      if (min !== undefined || max !== undefined) range[def.key] = { min, max };
    } else {
      const vals = splitVals(first(params[`f_${def.key}`]));
      if (vals.length) attr[def.key] = vals;
    }
  }

  const brands = splitVals(first(params.brand))
    .map((slug) => brandIdBySlug[slug])
    .filter((id): id is string => Boolean(id));

  const sortRaw = first(params.sort);
  const sort =
    sortRaw === "price-asc" || sortRaw === "price-desc" ? sortRaw : "name";

  const pageRaw = toNum(first(params.page));
  const page = pageRaw && pageRaw >= 1 ? Math.floor(pageRaw) : 1;

  return {
    attr,
    range,
    brands,
    price: { min: toNum(first(params.price_min)), max: toNum(first(params.price_max)) },
    avail: splitVals(first(params.avail)).filter((a) =>
      ["in", "supplier", "hide-out"].includes(a)
    ),
    sort,
    page,
  };
}

function matchesAttrValue(value: AttributeValues[string], selected: string[]): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return selected.some((s) => value.map(String).includes(s));
  if (typeof value === "boolean") return selected.includes(value ? "Yes" : "No");
  return selected.includes(String(value));
}

function matchesAvailability(p: ProductLike, avail: string[]): boolean {
  if (avail.length === 0) return true;
  const a = getAvailability(p);
  if (avail.includes("hide-out") && a.state === "out") return false;
  const positive = avail.filter((x) => x !== "hide-out");
  if (positive.length === 0) return true;
  return (
    (positive.includes("in") && (a.state === "in" || a.state === "low")) ||
    (positive.includes("supplier") && a.state === "supplier")
  );
}

export function productMatches(
  p: ProductLike,
  state: FilterState,
  opts: { skipAttrKey?: string; skipBrands?: boolean } = {}
): boolean {
  if (!matchesAvailability(p, state.avail)) return false;

  if (!opts.skipBrands && state.brands.length && !state.brands.includes(p.brandId)) {
    return false;
  }

  const dollars = p.priceCents / 100;
  if (state.price.min !== undefined && dollars < state.price.min) return false;
  if (state.price.max !== undefined && dollars > state.price.max) return false;

  for (const [key, selected] of Object.entries(state.attr)) {
    if (key === opts.skipAttrKey) continue;
    if (!selected.length) continue;
    if (!matchesAttrValue(p.values[key], selected)) return false;
  }

  for (const [key, r] of Object.entries(state.range)) {
    if (key === opts.skipAttrKey) continue;
    const raw = p.values[key];
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n)) return false;
    if (r.min !== undefined && n < r.min) return false;
    if (r.max !== undefined && n > r.max) return false;
  }

  return true;
}

export function applyFilters<T extends ProductLike>(
  products: T[],
  state: FilterState,
  getName: (p: T) => string
): T[] {
  const out = products.filter((p) => productMatches(p, state));
  if (state.sort === "price-asc") out.sort((a, b) => a.priceCents - b.priceCents);
  else if (state.sort === "price-desc") out.sort((a, b) => b.priceCents - a.priceCents);
  else out.sort((a, b) => getName(a).localeCompare(getName(b)));
  return out;
}

// Facet counts: for each option, the result count if that option were toggled
// on — computed against every OTHER active filter (standard facet behaviour).
export function facetCount(
  products: ProductLike[],
  state: FilterState,
  def: AttributeDef,
  option: string
): number {
  return products.filter(
    (p) =>
      productMatches(p, state, { skipAttrKey: def.key }) &&
      matchesAttrValue(p.values[def.key], [option])
  ).length;
}

export function brandFacetCount(
  products: ProductLike[],
  state: FilterState,
  brandId: string
): number {
  return products.filter(
    (p) => productMatches(p, state, { skipBrands: true }) && p.brandId === brandId
  ).length;
}

// Numeric bounds across the (otherwise-filtered) set, for range placeholders.
export function numericBounds(
  products: ProductLike[],
  state: FilterState,
  def: AttributeDef
): { min: number; max: number } | null {
  const nums = products
    .filter((p) => productMatches(p, state, { skipAttrKey: def.key }))
    .map((p) => {
      const raw = p.values[def.key];
      return typeof raw === "number" ? raw : Number(raw);
    })
    .filter((n) => Number.isFinite(n));
  if (!nums.length) return null;
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

export function countActiveFilters(state: FilterState): number {
  return (
    Object.values(state.attr).reduce((s, v) => s + v.length, 0) +
    Object.keys(state.range).length +
    (state.brands.length ? 1 : 0) +
    (state.price.min !== undefined || state.price.max !== undefined ? 1 : 0) +
    state.avail.length
  );
}
