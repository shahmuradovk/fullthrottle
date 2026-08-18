import { appUrl } from "@/lib/app-url";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { formatMoney } from "@/lib/money";
import type { OrderStatus } from "@prisma/client";

// Transactional order emails. Credentials accounts must verify their email
// before order emails are sent (engineering brief §5) — unverified addresses
// are skipped, never bounced.

const SUBJECTS: Partial<Record<OrderStatus, (n: string) => string>> = {
  PAID: (n) => `Order placed — ${n}`,
  PREPARING: (n) => `We're preparing your order — ${n}`,
  PACKED: (n) => `Packed and ready — ${n}`,
  SHIPPED: (n) => `Shipped — ${n}`,
  DELIVERED: (n) => `Delivered — ${n}`,
  CANCELLED: (n) => `Order cancelled — ${n}`,
  REFUNDED: (n) => `Refund issued — ${n}`,
};

export async function sendOrderEmail(orderId: string, status: OrderStatus): Promise<void> {
  const subjectFor = SUBJECTS[status];
  if (!subjectFor) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: true },
  });
  if (!order) return;
  if (!order.user.emailVerified) {
    console.log(
      `[email] skipped ${status} email for ${order.number} — ${order.user.email} not verified yet.`
    );
    return;
  }

  const to = order.user.contactEmail ?? order.user.email;
  const lines = order.items
    .map((i) => `  ${i.brandName} ${i.name} × ${i.qty} — ${formatMoney(i.unitPriceCents * i.qty)}`)
    .join("\n");

  const statusLine: Partial<Record<OrderStatus, string>> = {
    PAID: "Your order is confirmed and now being prepared. You'll get a tracking number as soon as it ships.",
    PREPARING: "Your order is being prepared for packing.",
    PACKED: "Your order is packed and waiting for carrier pickup.",
    SHIPPED: order.trackingNumber
      ? `It's on the way: ${order.carrier} · ${order.trackingNumber}`
      : "It's on the way.",
    DELIVERED: "The carrier marked your order delivered. Something wrong? Reply to this email.",
    CANCELLED: "This order was cancelled. If a payment went through, the refund follows automatically.",
    REFUNDED: "Your refund has been issued. Banks post it within 5–10 business days.",
  };

  await sendEmail({
    to,
    subject: subjectFor(order.number),
    text: `Hi ${order.user.name},\n\n${statusLine[status] ?? ""}\n\nOrder ${order.number}\n${lines}\n\n  Subtotal ${formatMoney(order.subtotalCents)}\n  Shipping ${order.shippingCents === 0 ? "Free" : formatMoney(order.shippingCents)}\n  Tax ${formatMoney(order.taxCents)}\n  Total ${formatMoney(order.totalCents)}\n\nTrack it any time: ${appUrl()}/account/orders/${order.id}\n\n— Fullthrottle, Reno NV`,
  });
}
