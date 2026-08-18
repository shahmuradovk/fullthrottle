// The ONLY place totals are calculated (engineering brief §6). Server-side,
// always, from database prices. A price arriving from the client is ignored.

export const FREE_SHIPPING_THRESHOLD_CENTS = 9900; // free at $99 and above
export const SHIPPING_FLAT_CENTS = 995; // otherwise $9.95
export const ESTIMATED_TAX_RATE = 0.0825; // fallback estimate until Stripe Tax runs

export type PricedItem = { unitPriceCents: number; qty: number };

export type Totals = {
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  taxIsEstimate: boolean;
};

export function computeTotals(items: PricedItem[], taxCents?: number): Totals {
  const subtotalCents = items.reduce((s, i) => s + i.unitPriceCents * i.qty, 0);
  const shippingCents =
    subtotalCents === 0 || subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS
      ? 0
      : SHIPPING_FLAT_CENTS;
  const taxIsEstimate = taxCents === undefined;
  const resolvedTax =
    taxCents ?? Math.round((subtotalCents + shippingCents) * ESTIMATED_TAX_RATE);
  return {
    subtotalCents,
    shippingCents,
    taxCents: resolvedTax,
    totalCents: subtotalCents + shippingCents + resolvedTax,
    taxIsEstimate,
  };
}

// MAP (minimum advertised price) is a hard business rule: never advertise
// below it. Returns null when the price must not be shown in advertising
// surfaces (listing cards, PDP price line) — the cart shows the real price.
export function advertisedPriceCents(p: {
  priceCents: number;
  mapPriceCents?: number | null;
}): number | null {
  if (p.mapPriceCents != null && p.priceCents < p.mapPriceCents) return null;
  return p.priceCents;
}
