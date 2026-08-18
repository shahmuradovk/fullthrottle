import type { AttributeDef, AttributeValues } from "@/lib/attributes/types";
import { formatAttributeValue } from "@/lib/attributes/format";
import { cn } from "@/lib/cn";

// The fiche spec table — rows render exclusively from AttributeDef[] and the
// product's values; nothing here may name a specific attribute. Rows with no
// value are omitted; row numbers are assigned after omission (01, 02, …).
export function SpecTable({
  attributes,
  values,
  className,
}: {
  attributes: AttributeDef[];
  values: AttributeValues;
  className?: string;
}) {
  const rows = [...attributes]
    .sort((a, b) => a.position - b.position)
    .map((def) => ({ def, value: formatAttributeValue(def, values[def.key]) }))
    .filter((r): r is { def: AttributeDef; value: string } => r.value !== null);

  if (rows.length === 0) return null;

  return (
    <div className={cn("border-t-[1.5px] border-ink", className)}>
      {rows.map(({ def, value }, i) => (
        <div
          key={def.key}
          className="grid grid-cols-[36px_1fr_1fr] items-baseline gap-3 border-b border-line py-2.5"
        >
          <span className="font-mono text-[11px] text-accent">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-secondary">
            {def.name}
          </span>
          <span className="type-data text-ink">{value}</span>
        </div>
      ))}
    </div>
  );
}
