import { describe, it, expect } from "vitest";
import { formatNotebook, normalizeNote } from "../lib/assistant/notes";

describe("store notebook", () => {
  it("formats notes as dated lines and marks the empty state", () => {
    expect(formatNotebook([])).toContain("empty");
    const out = formatNotebook([
      { note: "Attribute values are keyed by slugified KEY, not display name.", at: "2026-08-21" },
      { note: "Owner prices helmets himself — never guess a price.", at: "2026-08-21" },
    ]);
    expect(out.split("\n")).toHaveLength(2);
    expect(out).toContain("- [2026-08-21] Attribute values are keyed");
  });

  it("normalizes whitespace and case for dedupe", () => {
    expect(normalizeNote("  The   OWNER prices\nhelmets ")).toBe("the owner prices helmets");
    expect(normalizeNote("same lesson")).toBe(normalizeNote("Same  Lesson"));
  });
});
