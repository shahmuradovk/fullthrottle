"use client";

import { Chip } from "@/components/ui/chip";

// Gallery-only wrapper: the removable chip needs a click handler, which a
// server component cannot pass down — so the demo row lives in a client file.
export function ChipDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Chip active onRemove={() => {}} removeLabel="Remove filter Certification: ECE 22.06">
        Certification: ECE 22.06
      </Chip>
      <Chip>Weight ≤ 1,500 g</Chip>
    </div>
  );
}
