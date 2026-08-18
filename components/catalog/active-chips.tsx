"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Chip } from "@/components/ui/chip";
import type { ActiveChip } from "./filter-types";

export function ActiveChips({ chips }: { chips: ActiveChip[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (!chips.length) return null;

  const removeChip = (chip: ActiveChip) => {
    const next = new URLSearchParams(params.toString());
    for (const edit of chip.remove) {
      if (edit.value !== undefined) {
        const current = next.get(edit.param)?.split("~").filter(Boolean) ?? [];
        const updated = current.filter((v) => v !== edit.value);
        if (updated.length) next.set(edit.param, updated.join("~"));
        else next.delete(edit.param);
      } else {
        next.delete(edit.param);
      }
    }
    next.delete("page");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Chip
          key={chip.label}
          active
          onRemove={() => removeChip(chip)}
          removeLabel={`Remove filter ${chip.label}`}
        >
          {chip.label}
        </Chip>
      ))}
    </div>
  );
}
