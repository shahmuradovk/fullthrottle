"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("sort") ?? "name";

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="type-label text-ink-secondary">
        Sort
      </label>
      <select
        id="sort"
        value={current}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value === "name") next.delete("sort");
          else next.set("sort", e.target.value);
          next.delete("page");
          router.push(`${pathname}?${next.toString()}`, { scroll: false });
        }}
        className="rounded-1 border border-line bg-surface px-2.5 py-2 text-sm text-ink"
      >
        <option value="name">Name A–Z</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
      </select>
    </div>
  );
}
