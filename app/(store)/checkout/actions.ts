"use server";

import { appUrl } from "@/lib/app-url";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/customer";
import { readCart } from "@/lib/cart";
import { computeTotals } from "@/lib/pricing";
import { computeTaxCents } from "@/lib/tax";
import { createPendingOrder, OrderTransitionError, type ShipTo } from "@/lib/orders";
import {
  createPaymentIntentForOrder,
  stripeConfigured,
  stripePublishableKey,
} from "@/lib/payments/stripe";
import { createPaypalOrder, paypalConfigured } from "@/lib/payments/paypal";
import { US_STATES } from "@/lib/us-states";
import { rateLimit, RateLimitError } from "@/lib/rate-limit";

export type PrepareResult =
  | { error: string }
  | {
      kind: "stripe";
      orderId: string;
      orderNumber: string;
      clientSecret: string;
      publishableKey: string;
      totalCents: number;
      taxCents: number;
      taxIsEstimate: boolean;
    }
  | null;

const addressSchema = z.object({
  line1: z.string().trim().min(1, "Enter a street address."),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1, "Enter a city."),
  state: z.enum(US_STATES, { message: "Pick a state — we ship US-only." }),
  zip: z.string().regex(/^\d{5}$/, "Enter a 5-digit ZIP code."),
  phone: z.string().trim().optional(),
  method: z.enum(["CARD", "PAYPAL"]),
  saveAddress: z.boolean(),
});

export async function prepareCheckoutAction(
  _prev: PrepareResult,
  formData: FormData
): Promise<PrepareResult> {
  const user = await requireUser("/checkout");

  // Card-testing bursts get blocked, not just logged (brief §10).
  try {
    await rateLimit({ key: `checkout:${user.id}`, max: 10, windowSeconds: 600 });
  } catch (e) {
    if (e instanceof RateLimitError) return { error: e.message };
    throw e;
  }
  const cart = await readCart();
  if (!cart || cart.items.length === 0) redirect("/cart");

  const parsed = addressSchema.safeParse({
    line1: formData.get("line1"),
    line2: formData.get("line2") ?? "",
    city: formData.get("city"),
    state: formData.get("state"),
    zip: formData.get("zip"),
    phone: formData.get("phone") ?? "",
    method: formData.get("method") ?? "CARD",
    saveAddress: formData.get("saveAddress") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const shipTo: ShipTo = {
    name: user.name,
    line1: data.line1,
    line2: data.line2 || null,
    city: data.city,
    state: data.state,
    zip: data.zip,
    phone: data.phone || null,
  };

  if (data.saveAddress) {
    const count = await prisma.address.count({ where: { userId: user.id } });
    await prisma.address.create({
      data: {
        userId: user.id,
        line1: shipTo.line1,
        line2: shipTo.line2,
        city: shipTo.city,
        state: shipTo.state,
        zip: shipTo.zip,
        phone: shipTo.phone,
        isDefault: count === 0,
      },
    });
  }

  // Compelling Evidence 3.0 — captured at checkout, not derived later (§7).
  const h = await headers();
  const ipAddress = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const userAgent = h.get("user-agent");
  const deviceHash = createHash("sha256")
    .update(`${ipAddress ?? ""}|${userAgent ?? ""}`)
    .digest("hex")
    .slice(0, 32);
  const sessionId = createHash("sha256").update(cart.token).digest("hex").slice(0, 32);

  const totalsPreTax = computeTotals(
    cart.items.map((i) => ({ unitPriceCents: i.product.priceCents, qty: i.qty })),
    0
  );
  const { taxCents, isEstimate } = await computeTaxCents({
    items: cart.items.map((i) => ({
      amountCents: i.product.priceCents * i.qty,
      reference: i.product.sku,
    })),
    shippingCents: totalsPreTax.shippingCents,
    shipTo,
  });

  let order;
  try {
    order = await createPendingOrder({
      userId: user.id,
      cartId: cart.id,
      shipTo,
      paymentMethod: data.method === "PAYPAL" ? "PAYPAL" : "CARD",
      taxCents,
      ce3: { ipAddress, userAgent, deviceHash, sessionId },
    });
  } catch (e) {
    if (e instanceof OrderTransitionError) return { error: e.message };
    throw e;
  }

  if (data.method === "PAYPAL") {
    if (!paypalConfigured()) {
      return {
        error:
          "PayPal isn't configured yet (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET). Pick card instead, or add the keys.",
      };
    }
    const { paypalOrderId, approveUrl } = await createPaypalOrder(
      order,
      `${appUrl()}/checkout/paypal/return`,
      `${appUrl()}/checkout?cancelled=paypal`
    );
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentRef: paypalOrderId },
    });
    redirect(approveUrl);
  }

  if (!stripeConfigured() || !stripePublishableKey()) {
    return {
      error:
        "Card payments aren't configured yet (STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY). Add the Stripe keys to take payments.",
    };
  }

  const { clientSecret, paymentIntentId } = await createPaymentIntentForOrder(order);
  await prisma.order.update({
    where: { id: order.id },
    data: { paymentRef: paymentIntentId },
  });

  return {
    kind: "stripe",
    orderId: order.id,
    orderNumber: order.number,
    clientSecret,
    publishableKey: stripePublishableKey()!,
    totalCents: order.totalCents,
    taxCents: order.taxCents,
    taxIsEstimate: isEstimate,
  };
}
