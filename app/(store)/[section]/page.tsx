import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getSectionBySlug,
  listSectionProducts,
  toAttributeDef,
  PAGE_SIZE,
} from "@/lib/catalog";
import {
  countActiveFilters,
  facetCount,
  brandFacetCount,
  numericBounds,
  productMatches,
  type FilterState,
  type ProductLike,
} from "@/lib/attributes/filter";
import type { AttributeDef } from "@/lib/attributes/types";
import { FilterSidebar } from "@/components/catalog/filter-sidebar";
import { ActiveChips } from "@/components/catalog/active-chips";
import { SortSelect } from "@/components/catalog/sort-select";
import { Pagination } from "@/components/catalog/pagination";
import { ProductCard } from "@/components/catalog/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { ActiveChip, SidebarGroup } from "@/components/catalog/filter-types";
import type { Brand } from "@prisma/client";

export const dynamic = "force-dynamic";

type Params = { section: string };
type SearchParams = Record<string, string | string[] | undefined>;

function fmtNum(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function buildGroups(
  all: ProductLike[],
  state: FilterState,
  defs: AttributeDef[],
  brands: Brand[]
): SidebarGroup[] {
  const groups: SidebarGroup[] = [];

  // Availability — counts computed against every other active filter.
  const noAvail: FilterState = { ...state, avail: [] };
  const availMatches = all.filter((p) => productMatches(p, noAvail));
  const inCount = availMatches.filter((p) => {
    const s = p.supplySource === "SUPPLIER" ? 0 : p.stock;
    return s > 0;
  }).length;
  const supplierCount = availMatches.filter(
    (p) => p.supplySource === "SUPPLIER" && (p.supplierStock ?? 0) > 0
  ).length;
  const outCount = availMatches.length - inCount - supplierCount;
  groups.push({
    kind: "check",
    name: "Availability",
    param: "avail",
    options: [
      { label: "In stock", value: "in", count: inCount, selected: state.avail.includes("in") },
      {
        label: "Ships from supplier",
        value: "supplier",
        count: supplierCount,
        selected: state.avail.includes("supplier"),
      },
      {
        label: "Hide out of stock",
        value: "hide-out",
        count: outCount,
        selected: state.avail.includes("hide-out"),
      },
    ],
  });

  // Attribute groups, in template order — nothing here is hardcoded.
  for (const def of defs.filter((d) => d.filterable).sort((a, b) => a.position - b.position)) {
    if (def.type === "NUMBER") {
      const bounds = numericBounds(all, state, def);
      const r = state.range[def.key] ?? {};
      groups.push({
        kind: "range",
        name: def.name,
        paramMin: `f_${def.key}_min`,
        paramMax: `f_${def.key}_max`,
        unit: def.unit ?? "",
        min: r.min !== undefined ? String(r.min) : "",
        max: r.max !== undefined ? String(r.max) : "",
        placeholderMin: bounds ? fmtNum(bounds.min) : "",
        placeholderMax: bounds ? fmtNum(bounds.max) : "",
      });
    } else {
      const options = def.type === "BOOLEAN" ? ["Yes", "No"] : def.options;
      groups.push({
        kind: "check",
        name: def.name,
        param: `f_${def.key}`,
        options: options.map((o) => ({
          label: o,
          value: o,
          count: facetCount(all, state, def, o),
          selected: (state.attr[def.key] ?? []).includes(o),
        })),
      });
    }
  }

  // Price range.
  const noPrice: FilterState = { ...state, price: {} };
  const priceMatches = all.filter((p) => productMatches(p, noPrice));
  const priceMin = priceMatches.length
    ? Math.min(...priceMatches.map((p) => p.priceCents / 100))
    : 0;
  const priceMax = priceMatches.length
    ? Math.max(...priceMatches.map((p) => p.priceCents / 100))
    : 0;
  groups.push({
    kind: "range",
    name: "Price",
    paramMin: "price_min",
    paramMax: "price_max",
    unit: "USD",
    min: state.price.min !== undefined ? String(state.price.min) : "",
    max: state.price.max !== undefined ? String(state.price.max) : "",
    placeholderMin: fmtNum(priceMin),
    placeholderMax: fmtNum(priceMax),
  });

  // Brand.
  groups.push({
    kind: "check",
    name: "Brand",
    param: "brand",
    options: brands.map((b) => ({
      label: b.name,
      value: b.slug,
      count: brandFacetCount(all, state, b.id),
      selected: state.brands.includes(b.id),
    })),
  });

  return groups;
}

function buildChips(
  state: FilterState,
  defs: AttributeDef[],
  brands: Brand[]
): ActiveChip[] {
  const chips: ActiveChip[] = [];
  const defByKey = Object.fromEntries(defs.map((d) => [d.key, d]));

  const availLabels: Record<string, string> = {
    in: "In stock",
    supplier: "Ships from supplier",
    "hide-out": "Hide out of stock",
  };
  for (const a of state.avail) {
    chips.push({ label: availLabels[a] ?? a, remove: [{ param: "avail", value: a }] });
  }

  for (const [key, values] of Object.entries(state.attr)) {
    const def = defByKey[key];
    for (const v of values) {
      chips.push({
        label: `${def?.name ?? key}: ${v}`,
        remove: [{ param: `f_${key}`, value: v }],
      });
    }
  }

  for (const [key, r] of Object.entries(state.range)) {
    const def = defByKey[key];
    const unit = def?.unit ? ` ${def.unit}` : "";
    const label =
      r.min !== undefined && r.max !== undefined
        ? `${def?.name ?? key} ${fmtNum(r.min)}–${fmtNum(r.max)}${unit}`
        : r.min !== undefined
          ? `${def?.name ?? key} ≥ ${fmtNum(r.min)}${unit}`
          : `${def?.name ?? key} ≤ ${fmtNum(r.max as number)}${unit}`;
    chips.push({
      label,
      remove: [{ param: `f_${key}_min` }, { param: `f_${key}_max` }],
    });
  }

  if (state.price.min !== undefined || state.price.max !== undefined) {
    const label =
      state.price.min !== undefined && state.price.max !== undefined
        ? `Price $${fmtNum(state.price.min)}–$${fmtNum(state.price.max)}`
        : state.price.min !== undefined
          ? `Price ≥ $${fmtNum(state.price.min)}`
          : `Price ≤ $${fmtNum(state.price.max as number)}`;
    chips.push({ label, remove: [{ param: "price_min" }, { param: "price_max" }] });
  }

  for (const id of state.brands) {
    const brand = brands.find((b) => b.id === id);
    if (brand) {
      chips.push({
        label: `Brand: ${brand.name}`,
        remove: [{ param: "brand", value: brand.slug }],
      });
    }
  }

  return chips;
}

// When zero results: find the single filter group whose removal brings the
// most products back, so the empty state can offer one-click recovery.
function findRecovery(
  all: ProductLike[],
  state: FilterState,
  defs: AttributeDef[],
  searchParams: SearchParams,
  basePath: string
): { label: string; count: number; href: string } | null {
  const defByKey = Object.fromEntries(defs.map((d) => [d.key, d]));
  const candidates: { label: string; params: string[]; count: number }[] = [];

  const countWith = (partial: Partial<FilterState>) =>
    all.filter((p) => productMatches(p, { ...state, ...partial })).length;

  for (const key of Object.keys(state.range)) {
    candidates.push({
      label: `Remove the ${defByKey[key]?.name.toLowerCase() ?? key} limit`,
      params: [`f_${key}_min`, `f_${key}_max`],
      count: countWith({ range: Object.fromEntries(Object.entries(state.range).filter(([k]) => k !== key)) }),
    });
  }
  for (const key of Object.keys(state.attr)) {
    candidates.push({
      label: `Remove the ${defByKey[key]?.name.toLowerCase() ?? key} filter`,
      params: [`f_${key}`],
      count: countWith({ attr: Object.fromEntries(Object.entries(state.attr).filter(([k]) => k !== key)) }),
    });
  }
  if (state.price.min !== undefined || state.price.max !== undefined) {
    candidates.push({
      label: "Remove the price limit",
      params: ["price_min", "price_max"],
      count: countWith({ price: {} }),
    });
  }
  if (state.brands.length) {
    candidates.push({
      label: "Remove the brand filter",
      params: ["brand"],
      count: countWith({ brands: [] }),
    });
  }
  if (state.avail.length) {
    candidates.push({
      label: "Remove the availability filter",
      params: ["avail"],
      count: countWith({ avail: [] }),
    });
  }

  const best = candidates.filter((c) => c.count > 0).sort((a, b) => b.count - a.count)[0];
  if (!best) return null;

  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val !== undefined && !best.params.includes(k) && k !== "page") next.set(k, val);
  }
  const qs = next.toString();
  return { label: best.label, count: best.count, href: qs ? `${basePath}?${qs}` : basePath };
}

export default async function SectionPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { section: slug } = await params;
  const sp = await searchParams;
  const section = await getSectionBySlug(slug);
  if (!section) notFound();

  const result = await listSectionProducts(section.id, section.attributes, section.brands, sp);
  const defs = section.attributes.map(toAttributeDef);
  const groups = buildGroups(result.all, result.state, defs, section.brands);
  const chips = buildChips(result.state, defs, section.brands);
  const activeCount = countActiveFilters(result.state);
  const basePath = `/${section.slug}`;
  const recovery =
    result.total === 0 && activeCount > 0
      ? findRecovery(result.all, result.state, defs, sp, basePath)
      : null;

  return (
    <main className="px-5 pb-12 pt-8 md:px-10">
      <nav aria-label="Breadcrumb" className="mb-2.5 font-mono text-xs text-ink-secondary">
        <Link href="/" className="!text-ink-secondary hover:!text-ink">
          Home
        </Link>{" "}
        / {section.name}
      </nav>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-[40px] font-bold uppercase leading-none text-ink">
          {section.name}{" "}
          <span className="font-mono text-sm font-normal normal-case text-ink-secondary">
            · {result.total} {result.total === 1 ? "product" : "products"}
          </span>
        </h1>
        <SortSelect />
      </div>

      <div className="flex flex-col items-start gap-8 lg:flex-row">
        <FilterSidebar groups={groups} activeCount={activeCount} />

        <section className="w-full min-w-0 flex-1">
          <ActiveChips chips={chips} />

          {result.total === 0 ? (
            <EmptyState
              title={`No ${section.name.replace(/^Moto\s+/i, "").toLowerCase()} match these filters`}
              body={
                recovery
                  ? `${recovery.label.replace(/^Remove/, "Removing")} brings back ${recovery.count} ${recovery.count === 1 ? "result" : "results"}.`
                  : "Try removing a filter to see more."
              }
              className="px-10 py-16"
              action={
                <div className="flex flex-wrap justify-center gap-2.5">
                  {recovery && (
                    <Button asChildHref={recovery.href}>{recovery.label}</Button>
                  )}
                  <Button variant="secondary" asChildHref={basePath}>
                    Clear all filters
                  </Button>
                </div>
              }
            />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {result.pageItems.map((p, i) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    attributes={defs}
                    calloutN={(result.state.page - 1) * PAGE_SIZE + i + 1}
                  />
                ))}
              </div>
              <Pagination
                basePath={basePath}
                searchParams={sp}
                page={result.state.page}
                totalPages={result.totalPages}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
