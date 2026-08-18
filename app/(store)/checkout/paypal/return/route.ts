import { NextResponse, type NextRequest } from "next/server";
import { capturePaypalOrder, paypalConfigured } from "@/lib/payments/paypal";
import { markOrderPaid } from "@/lib/orders";

export const runtime = "nodejs";

// PayPal approval lands back here; we capture server-side. The webhook is
// still the source of truth — markOrderPaid is idempotent either way.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || !paypalConfigured()) {
    return NextResponse.redirect(new URL("/cart", request.url));
  }

  const { completed, orderId } = await capturePaypalOrder(token);
  if (completed && orderId) {
    await markOrderPaid(orderId, token);
    return NextResponse.redirect(
      new URL(`/checkout/confirmation/${orderId}`, request.url)
    );
  }
  return NextResponse.redirect(new URL("/checkout?failed=paypal", request.url));
}
