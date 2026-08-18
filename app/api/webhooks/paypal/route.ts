import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { paypalConfigured, verifyPaypalWebhook } from "@/lib/payments/paypal";
import { markOrderPaid } from "@/lib/orders";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!paypalConfigured()) {
    return NextResponse.json({ error: "PayPal not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const verified = await verifyPaypalWebhook(request.headers, rawBody);
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    id: string;
    event_type: string;
    resource?: { id?: string; custom_id?: string; status?: string };
  };

  // Idempotent on the PayPal event id.
  try {
    await prisma.processedWebhook.create({
      data: { provider: "paypal", eventId: event.id },
    });
  } catch {
    return NextResponse.json({ received: true });
  }

  if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
    const orderId = event.resource?.custom_id;
    const captureId = event.resource?.id;
    if (orderId && captureId) {
      await markOrderPaid(orderId, captureId);
    }
  }

  return NextResponse.json({ received: true });
}
