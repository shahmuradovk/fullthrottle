import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe, stripeConfigured } from "@/lib/payments/stripe";
import { markOrderPaid, transitionOrder } from "@/lib/orders";

// The webhook is the source of truth for "paid" (engineering brief §7).
// Signature verified before any parsing; idempotent on the event id; never
// logs a payment credential.

export const runtime = "nodejs";

async function alreadyProcessed(eventId: string): Promise<boolean> {
  try {
    await prisma.processedWebhook.create({
      data: { provider: "stripe", eventId },
    });
    return false;
  } catch {
    return true; // unique violation → replay
  }
}

export async function POST(request: Request) {
  if (!stripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (await alreadyProcessed(event.id)) return NextResponse.json({ received: true });

  switch (event.type) {
    case "payment_intent.succeeded": {
      const intent = event.data.object;
      const orderId = intent.metadata?.orderId;
      if (orderId) {
        await markOrderPaid(orderId, intent.id);
        // Record the wallet actually used (Apple Pay / Google Pay ride the
        // card rails) — read from the charge, never logged.
        try {
          const chargeId =
            typeof intent.latest_charge === "string"
              ? intent.latest_charge
              : intent.latest_charge?.id;
          if (chargeId) {
            const charge = await getStripe().charges.retrieve(chargeId);
            const wallet = charge.payment_method_details?.card?.wallet?.type;
            if (wallet === "apple_pay" || wallet === "google_pay") {
              await prisma.order.update({
                where: { id: orderId },
                data: { paymentMethod: wallet === "apple_pay" ? "APPLE_PAY" : "GOOGLE_PAY" },
              });
            }
          }
        } catch {
          // wallet attribution is best-effort
        }
      }
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      const paymentIntentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (paymentIntentId) {
        const order = await prisma.order.findFirst({
          where: { paymentRef: paymentIntentId },
        });
        if (order && order.status !== "REFUNDED") {
          try {
            await transitionOrder({
              orderId: order.id,
              next: "REFUNDED",
              note: "Refund confirmed by Stripe.",
            });
          } catch {
            // e.g. refund on a cancelled order — nothing to transition
          }
        }
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
