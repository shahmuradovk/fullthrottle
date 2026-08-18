import { describe, it, expect } from "vitest";
import { formatAttributeValue } from "../lib/attributes/format";
import type { AttributeType } from "@prisma/client";

describe("formatAttributeValue", () => {
  it("formats a number with its unit, thousands-separated", () => {
    expect(formatAttributeValue({ type: "NUMBER", unit: "g" }, 1270)).toBe("1,270 g");
    expect(formatAttributeValue({ type: "NUMBER", unit: "kg" }, 2.4)).toBe("2.4 kg");
    expect(formatAttributeValue({ type: "NUMBER", unit: null }, 51)).toBe("51");
  });

  it("formats booleans as Yes / No", () => {
    expect(formatAttributeValue({ type: "BOOLEAN", unit: null }, true)).toBe("Yes");
    expect(formatAttributeValue({ type: "BOOLEAN", unit: null }, false)).toBe("No");
  });

  it("joins multiselect values with a middle dot", () => {
    expect(
      formatAttributeValue({ type: "MULTISELECT", unit: null }, ["DOT", "ECE 22.06", "SNELL M2020"])
    ).toBe("DOT · ECE 22.06 · SNELL M2020");
  });

  it("returns null for empty values so the row is omitted", () => {
    expect(formatAttributeValue({ type: "TEXT", unit: null }, "")).toBeNull();
    expect(formatAttributeValue({ type: "TEXT", unit: null }, null)).toBeNull();
    expect(formatAttributeValue({ type: "MULTISELECT", unit: null }, [])).toBeNull();
    expect(formatAttributeValue({ type: "NUMBER", unit: "g" }, undefined)).toBeNull();
  });

  it("degrades an unknown attribute type to text instead of throwing", () => {
    const unknownType = "HOLOGRAM" as AttributeType;
    expect(() => formatAttributeValue({ type: unknownType, unit: null }, "shimmer")).not.toThrow();
    expect(formatAttributeValue({ type: unknownType, unit: null }, "shimmer")).toBe("shimmer");
  });
});
