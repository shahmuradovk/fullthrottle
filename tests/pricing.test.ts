import { describe, it, expect } from "vitest";
import {
  computeTotals,
  advertisedPriceCents,
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHIPPING_FLAT_CENTS,
} from "../lib/pricing";

describe("computeTotals", () => {
  it("ships free at $99 and above", () => {
    const t = computeTotals([{ unitPriceCents: FREE_SHIPPING_THRESHOLD_CENTS, qty: 1 }], 0);
    expect(t.shippingCents).toBe(0);
  });

  it("charges $9.95 below the threshold", () => {
    const t = computeTotals([{ unitPriceCents: 9899, qty: 1 }], 0);
    expect(t.shippingCents).toBe(SHIPPING_FLAT_CENTS);
  });

  it("charges nothing for an empty cart", () => {
    const t = computeTotals([], 0);
    expect(t.subtotalCents).toBe(0);
    expect(t.shippingCents).toBe(0);
    expect(t.totalCents).toBe(0);
  });

  it("uses the provided tax and marks it non-estimate", () => {
    const t = computeTotals([{ unitPriceCents: 10000, qty: 2 }], 1650);
    expect(t.taxCents).toBe(1650);
    expect(t.taxIsEstimate).toBe(false);
    expect(t.totalCents).toBe(20000 + 0 + 1650);
  });

  it("estimates 8.25% when no tax is given", () => {
    const t = computeTotals([{ unitPriceCents: 10000, qty: 1 }]);
    expect(t.taxIsEstimate).toBe(true);
    expect(t.taxCents).toBe(Math.round(10000 * 0.0825));
  });

  it("multiplies quantity into the subtotal", () => {
    const t = computeTotals([{ unitPriceCents: 54900, qty: 2 }], 0);
    expect(t.subtotalCents).toBe(109800);
  });
});

describe("advertisedPriceCents (MAP)", () => {
  it("returns the price when no MAP applies", () => {
    expect(advertisedPriceCents({ priceCents: 89900, mapPriceCents: null })).toBe(89900);
  });
  it("returns the price when it meets MAP", () => {
    expect(advertisedPriceCents({ priceCents: 89900, mapPriceCents: 79900 })).toBe(89900);
  });
  it("hides a price below MAP — never advertise under it", () => {
    expect(advertisedPriceCents({ priceCents: 69900, mapPriceCents: 79900 })).toBeNull();
  });
});
