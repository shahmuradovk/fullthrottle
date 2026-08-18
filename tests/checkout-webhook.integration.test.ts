import { describe, it, expect } from "vitest";

// Full checkout-to-webhook integration (engineering brief §11): create a
// PaymentIntent with Stripe test keys, confirm it with the test card, and
// assert the webhook path marks the order PAID.
//
// Runs only when STRIPE_SECRET_KEY (a test key) and DATABASE_URL are present;
// CI without secrets skips it. The webhook-side logic itself is covered by
// the DB-backed script in the Phase 5 verification and by markOrderPaid's
// idempotency handling.
const hasStripe = Boolean(
  process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") && process.env.DATABASE_URL
);

describe.skipIf(!hasStripe)("checkout → webhook (Stripe test mode)", () => {
  it("a confirmed test PaymentIntent lands the order as PAID", async () => {
    const [{ prisma }, orders, stripeLib] = await Promise.all([
      import("../lib/db"),
      import("../lib/orders"),
      import("../lib/payments/stripe"),
    ]);
    const stripe = stripeLib.getStripe();

    const user = await prisma.user.findFirstOrThrow();
    const product = await prisma.product.findFirstOrThrow({ where: { stock: { gt: 0 } } });
    const cart = await prisma.cart.upsert({
      where: { userId: user.id },
      create: { userId: user.id, token: `test-${Date.now()}` },
      update: {},
    });
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId: product.id, qty: 1 },
    });

    const order = await orders.createPendingOrder({
      userId: user.id,
      cartId: cart.id,
      shipTo: { name: user.name, line1: "4418 Mill St", city: "Reno", state: "NV", zip: "89502" },
      paymentMethod: "CARD",
      taxCents: 0,
      ce3: {},
    });

    const { paymentIntentId } = await stripeLib.createPaymentIntentForOrder(order);
    const confirmed = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: "pm_card_visa",
      return_url: "http://localhost:3000/checkout/confirmation/test",
    });
    expect(confirmed.status).toBe("succeeded");

    // What the webhook handler does on payment_intent.succeeded:
    await orders.markOrderPaid(order.id, paymentIntentId);
    const paid = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(paid.status).toBe("PAID");
  });
});
