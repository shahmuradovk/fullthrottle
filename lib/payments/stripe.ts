import Stripe from "stripe";
import type { Order } from "@prisma/client";
import { STATEMENT_DESCRIPTOR } from "@/lib/orders";

// Stripe carries card, Apple Pay and Google Pay through the Payment Element.
// Card fields never exist in our DOM — the Element renders in Stripe's iframe
// (guardrail 5, SAQ A scope).

let client: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
    client = new Stripe(key);
  }
  return client;
}

export function stripePublishableKey(): string | null {
  return process.env.STRIPE_PUBLISHABLE_KEY ?? null;
}

// PaymentIntent created server-side with the amount recomputed at that
// moment; the idempotency key derives from the order + amount so retries
// never double-charge (engineering brief §7).
export async function createPaymentIntentForOrder(
  order: Pick<Order, "id" | "number" | "totalCents">
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const stripe = getStripe();
  const intent = await stripe.paymentIntents.create(
    {
      amount: order.totalCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      statement_descriptor_suffix: STATEMENT_DESCRIPTOR.slice(0, 10),
      metadata: { orderId: order.id, orderNumber: order.number },
    },
    { idempotencyKey: `order_${order.id}_${order.totalCents}` }
  );
  if (!intent.client_secret) throw new Error("Stripe returned no client secret.");
  return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
}
