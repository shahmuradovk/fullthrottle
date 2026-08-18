import { ESTIMATED_TAX_RATE } from "@/lib/pricing";
import { getStripe, stripeConfigured } from "@/lib/payments/stripe";
import type { ShipTo } from "@/lib/orders";

// Sales tax: Stripe Tax from the shipping address when Stripe is configured,
// an 8.25% estimate otherwise. Always labelled "Estimated sales tax" until
// the payment is confirmed.
export async function computeTaxCents(params: {
  items: { amountCents: number; reference: string }[];
  shippingCents: number;
  shipTo: ShipTo;
}): Promise<{ taxCents: number; isEstimate: boolean }> {
  const subtotal = params.items.reduce((s, i) => s + i.amountCents, 0);
  const estimate = () => ({
    taxCents: Math.round((subtotal + params.shippingCents) * ESTIMATED_TAX_RATE),
    isEstimate: true,
  });

  if (!stripeConfigured()) return estimate();

  try {
    const stripe = getStripe();
    const calculation = await stripe.tax.calculations.create({
      currency: "usd",
      customer_details: {
        address: {
          line1: params.shipTo.line1,
          line2: params.shipTo.line2 ?? undefined,
          city: params.shipTo.city,
          state: params.shipTo.state,
          postal_code: params.shipTo.zip,
          country: "US",
        },
        address_source: "shipping",
      },
      line_items: params.items.map((i) => ({
        amount: i.amountCents,
        reference: i.reference,
      })),
      shipping_cost: { amount: params.shippingCents },
    });
    return { taxCents: calculation.tax_amount_exclusive, isEstimate: false };
  } catch (e) {
    console.error("Stripe Tax calculation failed, using estimate:", e);
    return estimate();
  }
}
