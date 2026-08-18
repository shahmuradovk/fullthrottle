import { describe, it, expect } from "vitest";
import { applySyncUpdate } from "../lib/supplier/sync";

describe("applySyncUpdate — the price-lock rule", () => {
  const now = new Date("2026-08-18T12:00:00Z");

  it("never overwrites a locked price (guardrail 9)", () => {
    const update = applySyncUpdate({ priceLocked: true }, { stock: 12, priceCents: 49900 }, now);
    expect(update.supplierStock).toBe(12);
    expect(update.supplierPriceCents).toBe(49900);
    expect(update.priceCents).toBeUndefined(); // the admin's price survives
  });

  it("updates the live price only when unlocked", () => {
    const update = applySyncUpdate({ priceLocked: false }, { priceCents: 49900 }, now);
    expect(update.priceCents).toBe(49900);
  });

  it("touches nothing it was not given", () => {
    const update = applySyncUpdate({ priceLocked: false }, {}, now);
    expect(update).toEqual({ lastSyncedAt: now });
  });
});
