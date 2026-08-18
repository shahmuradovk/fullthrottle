"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import type { SidebarGroup } from "./filter-types";

const FILTER_PARAM_PREFIXES = ["f_", "brand", "price_min", "price_max", "avail"];

function useFilterUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const commit = (next: URLSearchParams) => {
    next.delete("page");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const toggleValue = (param: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    const current = next.get(param)?.split("~").filter(Boolean) ?? [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    if (updated.length) next.set(param, updated.join("~"));
    else next.delete(param);
    commit(next);
  };

  const setRange = (paramMin: string, paramMax: string, min: string, max: string) => {
    const next = new URLSearchParams(params.toString());
    if (min.trim()) next.set(paramMin, min.trim());
    else next.delete(paramMin);
    if (max.trim()) next.set(paramMax, max.trim());
    else next.delete(paramMax);
    commit(next);
  };

  const clearAll = () => {
    const next = new URLSearchParams(params.toString());
    for (const key of Array.from(next.keys())) {
      if (FILTER_PARAM_PREFIXES.some((p) => key === p || key.startsWith("f_"))) {
        next.delete(key);
      }
    }
    commit(next);
  };

  return { toggleValue, setRange, clearAll, params };
}

function RangeInputs({
  group,
  onCommit,
}: {
  group: Extract<SidebarGroup, { kind: "range" }>;
  onCommit: (min: string, max: string) => void;
}) {
  const [min, setMin] = useState(group.min);
  const [max, setMax] = useState(group.max);
  const commit = () => onCommit(min, max);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commit();
  };
  return (
    <div className="flex items-center gap-2">
      <input
        value={min}
        onChange={(e) => setMin(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
        inputMode="decimal"
        placeholder={group.placeholderMin}
        aria-label={`${group.name} minimum`}
        className="w-[70px] rounded-1 border border-line bg-surface px-2 py-1.5 font-mono text-[13px] text-ink placeholder:text-ink-secondary"
      />
      <span aria-hidden className="text-ink-secondary">
        –
      </span>
      <input
        value={max}
        onChange={(e) => setMax(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
        inputMode="decimal"
        placeholder={group.placeholderMax}
        aria-label={`${group.name} maximum`}
        className="w-[70px] rounded-1 border border-line bg-surface px-2 py-1.5 font-mono text-[13px] text-ink placeholder:text-ink-secondary"
      />
      {group.unit && (
        <span className="font-mono text-xs text-ink-secondary">{group.unit}</span>
      )}
    </div>
  );
}

function GroupBlock({ group }: { group: SidebarGroup }) {
  const { toggleValue, setRange } = useFilterUrl();
  return (
    <fieldset className="border-b border-line py-3.5">
      <legend className="type-label mb-2.5 text-ink">{group.name}</legend>
      {group.kind === "check" ? (
        <div className="flex flex-col gap-2">
          {group.options.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2.5 text-sm text-ink"
            >
              <input
                type="checkbox"
                checked={o.selected}
                onChange={() => toggleValue(group.param, o.value)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className="grid size-[15px] shrink-0 place-items-center rounded-1 border-[1.5px] border-ink bg-surface text-[10px] leading-none text-transparent peer-checked:bg-ink peer-checked:text-surface peer-focus-visible:[box-shadow:var(--focus-ring)]"
              >
                ✓
              </span>
              <span className="flex-1">{o.label}</span>
              <span className="font-mono text-[11px] text-ink-secondary">{o.count}</span>
            </label>
          ))}
        </div>
      ) : (
        <RangeInputs
          group={group}
          onCommit={(min, max) => setRange(group.paramMin, group.paramMax, min, max)}
        />
      )}
    </fieldset>
  );
}

export function FilterSidebar({
  groups,
  activeCount,
}: {
  groups: SidebarGroup[];
  activeCount: number;
}) {
  const { clearAll } = useFilterUrl();
  const [sheetOpen, setSheetOpen] = useState(false);

  const panel = (
    <div>
      <div className="flex items-baseline justify-between border-b-[1.5px] border-ink pb-2.5">
        <span className="type-label text-ink">Filters</span>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="cursor-pointer border-none bg-transparent text-[13px] text-link hover:underline"
          >
            Clear all ({activeCount})
          </button>
        )}
      </div>
      {groups.map((g) => (
        <GroupBlock key={g.name} group={g} />
      ))}
      <p className="pt-3 font-mono text-[10px] leading-relaxed text-ink-secondary">
        Filter groups render from the section’s attribute template — none of these
        labels are hardcoded.
      </p>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-[264px] shrink-0 lg:block">{panel}</aside>

      {/* Mobile: filters button + bottom sheet */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-1 border border-ink bg-transparent px-3.5 py-2 text-sm font-semibold text-ink"
        >
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
        {sheetOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end bg-bg/70"
            onClick={() => setSheetOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              onClick={(e) => e.stopPropagation()}
              className="max-h-[80vh] w-full overflow-y-auto rounded-t-2 border-t border-line bg-surface p-5 shadow-(--shadow-pop) motion-safe:animate-[sheet-up_var(--dur-sheet)_var(--ease)]"
            >
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="cursor-pointer border-none bg-transparent text-sm font-semibold text-ink"
                >
                  Done
                </button>
              </div>
              {panel}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
