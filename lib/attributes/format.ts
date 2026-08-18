import type { AttributeDef, AttributeValue } from "./types";

// The single formatter used by the spec table, product cards, and the admin —
// write once, render everywhere (engineering brief §4).
//
// Formatting rules (design plan Part 3):
//   NUMBER      → "1,270 g" (thousands-separated, unit appended when present)
//   BOOLEAN     → "Yes" / "No"
//   MULTISELECT → values joined with " · "
//   empty       → null (the row is omitted)
//   unknown     → degrades to plain text, never throws
export function formatAttributeValue(
  def: Pick<AttributeDef, "type" | "unit">,
  value: AttributeValue | undefined
): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return value.map(String).join(" · ");
  }

  switch (def.type) {
    case "BOOLEAN":
      return value ? "Yes" : "No";
    case "NUMBER": {
      const n = typeof value === "number" ? value : Number(value);
      if (Number.isNaN(n)) return String(value);
      const formatted = n.toLocaleString("en-US", { maximumFractionDigits: 2 });
      return def.unit ? `${formatted} ${def.unit}` : formatted;
    }
    case "SELECT":
    case "MULTISELECT":
    case "TEXT":
      return String(value);
    default:
      // An attribute type this code has never seen degrades to text.
      return String(value);
  }
}
