import type { Order } from "@prisma/client";

// PayPal Orders v2 over plain REST: create server-side, capture server-side —
// the client never sends an amount (engineering brief §7).

const BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

export function paypalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

async function accessToken(): Promise<string> {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status}).`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function createPaypalOrder(
  order: Pick<Order, "id" | "number" | "totalCents">,
  returnUrl: string,
  cancelUrl: string
): Promise<{ paypalOrderId: string; approveUrl: string }> {
  const token = await accessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: order.id,
          invoice_id: order.number,
          amount: {
            currency_code: "USD",
            value: (order.totalCents / 100).toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: "Fullthrottle",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });
  if (!res.ok) throw new Error(`PayPal order creation failed (${res.status}).`);
  const data = (await res.json()) as {
    id: string;
    links: { rel: string; href: string }[];
  };
  const approve = data.links.find((l) => l.rel === "approve")?.href;
  if (!approve) throw new Error("PayPal returned no approval link.");
  return { paypalOrderId: data.id, approveUrl: approve };
}

export async function capturePaypalOrder(
  paypalOrderId: string
): Promise<{ completed: boolean; orderId: string | null }> {
  const token = await accessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = (await res.json()) as {
    status?: string;
    purchase_units?: { payments?: { captures?: { custom_id?: string }[] } }[];
  };
  const orderId = data.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id ?? null;
  return { completed: res.ok && data.status === "COMPLETED", orderId };
}

// The webhook signature is verified on every event (engineering brief §7).
export async function verifyPaypalWebhook(
  headers: Headers,
  rawBody: string
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  const token = await accessToken();
  const res = await fetch(`${BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { verification_status?: string };
  return data.verification_status === "SUCCESS";
}
