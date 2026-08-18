import type { AttributeType } from "@prisma/client";

// The data-driven contract (engineering brief §4).
// Filters, spec rows, and admin form fields all render from AttributeDef[] —
// no component may contain a literal attribute name.
export type AttributeDef = {
  id: string;
  key: string;
  name: string;
  type: AttributeType;
  options: string[];
  unit?: string | null;
  filterable: boolean;
  position: number;
};

export type AttributeValue = string | string[] | number | boolean | null;

// Product.values shape: { [attributeKey]: AttributeValue }
export type AttributeValues = Record<string, AttributeValue>;
