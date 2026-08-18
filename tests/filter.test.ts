import { describe, it, expect } from "vitest";
import {
  parseFilters,
  productMatches,
  applyFilters,
  facetCount,
  numericBounds,
  countActiveFilters,
  type ProductLike,
} from "../lib/attributes/filter";
import type { AttributeDef } from "../lib/attributes/types";

const attributes: AttributeDef[] = [
  { id: "1", key: "shell-type", name: "Shell type", type: "SELECT", options: ["Full face", "Modular"], unit: null, filterable: true, position: 0 },
  { id: "2", key: "certification", name: "Certification", type: "MULTISELECT", options: ["DOT", "ECE 22.06"], unit: null, filterable: true, position: 1 },
  { id: "3", key: "pinlock-included", name: "Pinlock included", type: "BOOLEAN", options: [], unit: null, filterable: true, position: 2 },
  { id: "4", key: "weight", name: "Weight", type: "NUMBER", options: [], unit: "g", filterable: true, position: 3 },
];

const products: ProductLike[] = [
  { id: "a", brandId: "b1", priceCents: 54900, supplySource: "MANUAL", stock: 9, values: { "shell-type": "Full face", certification: ["DOT", "ECE 22.06"], "pinlock-included": true, weight: 1270 } },
  { id: "b", brandId: "b2", priceCents: 39900, supplySource: "MANUAL", stock: 0, values: { "shell-type": "Modular", certification: ["DOT"], "pinlock-included": true, weight: 1700 } },
  { id: "c", brandId: "b1", priceCents: 99900, supplySource: "SUPPLIER", stock: 0, supplierStock: 5, values: { "shell-type": "Full face", certification: ["DOT"], "pinlock-included": false, weight: 1560 } },
];

const brandIdBySlug = { agv: "b1", bell: "b2" };

describe("parseFilters", () => {
  it("reads attribute, range, brand, price, availability and paging params", () => {
    const state = parseFilters(
      {
        "f_shell-type": "Full face~Modular",
        f_weight_min: "1200",
        f_weight_max: "1600",
        brand: "agv",
        price_min: "100",
        avail: "in~hide-out",
        sort: "price-desc",
        page: "2",
      },
      attributes,
      brandIdBySlug
    );
    expect(state.attr["shell-type"]).toEqual(["Full face", "Modular"]);
    expect(state.range.weight).toEqual({ min: 1200, max: 1600 });
    expect(state.brands).toEqual(["b1"]);
    expect(state.price.min).toBe(100);
    expect(state.avail).toEqual(["in", "hide-out"]);
    expect(state.sort).toBe("price-desc");
    expect(state.page).toBe(2);
    expect(countActiveFilters(state)).toBe(7);
  });

  it("ignores junk values", () => {
    const state = parseFilters(
      { f_weight_min: "banana", sort: "sideways", page: "-3", avail: "teleport" },
      attributes,
      brandIdBySlug
    );
    expect(state.range.weight).toBeUndefined();
    expect(state.sort).toBe("name");
    expect(state.page).toBe(1);
    expect(state.avail).toEqual([]);
  });
});

describe("productMatches", () => {
  const base = parseFilters({}, attributes, brandIdBySlug);

  it("matches multiselect values by overlap", () => {
    const state = { ...base, attr: { certification: ["ECE 22.06"] } };
    expect(productMatches(products[0], state)).toBe(true);
    expect(productMatches(products[1], state)).toBe(false);
  });

  it("maps booleans through Yes/No", () => {
    const state = { ...base, attr: { "pinlock-included": ["No"] } };
    expect(productMatches(products[2], state)).toBe(true);
    expect(productMatches(products[0], state)).toBe(false);
  });

  it("applies numeric ranges and drops valueless products", () => {
    const state = { ...base, range: { weight: { max: 1500 } } };
    expect(productMatches(products[0], state)).toBe(true);
    expect(productMatches(products[1], state)).toBe(false);
  });

  it("hide-out removes out-of-stock; supplier stock counts as available", () => {
    const state = { ...base, avail: ["hide-out"] };
    expect(productMatches(products[1], state)).toBe(false);
    expect(productMatches(products[2], state)).toBe(true);
  });
});

describe("applyFilters + facets", () => {
  const base = parseFilters({}, attributes, brandIdBySlug);

  it("sorts by name by default and by price when asked", () => {
    const names: Record<string, string> = { a: "K6 S", b: "SRT Modular", c: "Corsair-X" };
    const byName = applyFilters(products, base, (p) => names[p.id]);
    expect(byName.map((p) => p.id)).toEqual(["c", "a", "b"]);
    const byPrice = applyFilters(products, { ...base, sort: "price-asc" }, (p) => names[p.id]);
    expect(byPrice.map((p) => p.id)).toEqual(["b", "a", "c"]);
  });

  it("counts facet options against the other active filters", () => {
    const state = { ...base, attr: { "shell-type": ["Modular"] } };
    // Facet for shell-type ignores its own selection: both options countable.
    expect(facetCount(products, state, attributes[0], "Full face")).toBe(2);
    // Certification facet respects the Modular filter.
    expect(facetCount(products, state, attributes[1], "DOT")).toBe(1);
  });

  it("computes numeric bounds over the otherwise-filtered set", () => {
    const bounds = numericBounds(products, base, attributes[3]);
    expect(bounds).toEqual({ min: 1270, max: 1700 });
  });
});
