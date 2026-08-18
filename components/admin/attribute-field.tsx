import type { AttributeDef, AttributeValue } from "@/lib/attributes/types";

// The single control renderer (engineering brief §4): one input per attribute,
// control chosen by type, submitted as `attr_<key>` form fields. An attribute
// type this code has never seen degrades to a text input rather than throwing.
export function AttributeField({
  def,
  value,
}: {
  def: AttributeDef;
  value: AttributeValue | undefined;
}) {
  const name = `attr_${def.key}`;
  const id = `field-${def.key}`;
  const inputClass =
    "w-full rounded-1 border border-line bg-surface px-2.5 py-2 text-sm text-ink placeholder:text-ink-secondary";

  const control = (() => {
    switch (def.type) {
      case "SELECT":
        return (
          <select id={id} name={name} defaultValue={typeof value === "string" ? value : ""} className={inputClass}>
            <option value="">— not set —</option>
            {def.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );
      case "MULTISELECT": {
        const selected = Array.isArray(value) ? value : [];
        return (
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`${id}-label`}>
            {def.options.map((o) => (
              <label
                key={o}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-pill border border-line px-2.5 py-1 font-mono text-[11px] text-ink has-checked:border-accent has-checked:bg-accent has-checked:text-accent-ink"
              >
                <input type="checkbox" name={name} value={o} defaultChecked={selected.includes(o)} className="sr-only" />
                {o}
              </label>
            ))}
          </div>
        );
      }
      case "NUMBER":
        return (
          <div className="flex items-center gap-2">
            <input
              id={id}
              name={name}
              type="number"
              step="any"
              defaultValue={typeof value === "number" ? value : ""}
              className={`${inputClass} max-w-40 font-mono`}
            />
            {def.unit && (
              <span className="font-mono text-[11px] text-ink-secondary">{def.unit}</span>
            )}
          </div>
        );
      case "BOOLEAN": {
        const current = typeof value === "boolean" ? String(value) : "";
        return (
          <div className="flex gap-4" role="radiogroup" aria-labelledby={`${id}-label`}>
            {[
              { label: "Yes", value: "true" },
              { label: "No", value: "false" },
              { label: "Not set", value: "" },
            ].map((o) => (
              <label key={o.value} className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-ink">
                <input
                  type="radio"
                  name={name}
                  value={o.value}
                  defaultChecked={current === o.value}
                  className="accent-(--color-accent)"
                />
                {o.label}
              </label>
            ))}
          </div>
        );
      }
      case "TEXT":
      default:
        // Unknown types degrade to a plain text input.
        return (
          <input
            id={id}
            name={name}
            defaultValue={value == null ? "" : String(value)}
            className={inputClass}
          />
        );
    }
  })();

  return (
    <div className="grid grid-cols-[150px_1fr] items-center gap-3 max-md:grid-cols-1 max-md:gap-1">
      <span id={`${id}-label`} className="type-label text-ink">
        {def.name}
      </span>
      {control}
    </div>
  );
}
