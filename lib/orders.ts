import { prisma } from "@/lib/db";
import { computeTotals } from "@/lib/pricing";
import { getAvailability } from "@/lib/supplier/availability";
import { sendOrderEmail } from "@/lib/order-emails";
import type { Order, OrderStatus, PaymentMethod, Prisma } from "@prisma/client";

// The order state machine lives here and nowhere else (engineering brief §8).
// Forward transitions only, no skipping, no editing history.

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["PREPARING", "CANCELLED", "REFUNDED"],
  PREPARING: ["PACKED", "CANCELLED", "REFUNDED"],
  PACKED: ["SHIPPED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export class OrderTransitionError extends Error {}

// Pure rule check — unit-testable without a database.
export function assertTransition(
  from: OrderStatus,
  to: OrderStatus,
  extras: { carrier?: string; trackingNumber?: string } = {}
): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new OrderTransitionError(`An order can't move from ${from} to ${to}.`);
  }
  if (to === "SHIPPED") {
    if (!extras.carrier?.trim() || !extras.trackingNumber?.trim()) {
      throw new OrderTransitionError("Enter a tracking number before marking this shipped.");
    }
  }
}

export type ShipTo = {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  zip: string;
  phone?: string | null;
};

export const STATEMENT_DESCRIPTOR = "FULLTHROTTLE";

export async function createPendingOrder(params: {
  userId: string;
  cartId: string;
  shipTo: ShipTo;
  paymentMethod: PaymentMethod;
  taxCents: number;
  ce3: {
    ipAddress?: string | null;
    userAgent?: string | null;
    deviceHash?: string | null;
    sessionId?: string | null;
  };
}): Promise<Order & { items: { name: string; qty: number; unitPriceCents: number }[] }> {
  return prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findUniqueOrThrow({
      where: { id: params.cartId },
      include: { items: { include: { product: { include: { brand: true } } } } },
    });
    if (cart.items.length === 0) {
      throw new OrderTransitionError("Your cart is empty. Add a part before checking out.");
    }

    // Availability is re-checked at payment-intent creation (brief §6).
    for (const item of cart.items) {
      const availability = getAvailability(item.product);
      if (!availability.inStock || availability.qty < item.qty) {
        throw new OrderTransitionError(
          `${item.product.brand.name} ${item.product.name} ${
            availability.inStock
              ? `only has ${availability.qty} left`
              : "went out of stock while it was in your cart"
          }. Adjust the quantity and try again.`
        );
      }
      // Compliance is enforced, not decorative (guardrail 13).
      if (params.shipTo.state === "CA" && !item.product.caLegal) {
        throw new OrderTransitionError(
          `${item.product.brand.name} ${item.product.name} has no CARB exemption — we can't ship it to a California address. Remove it or ship to another state.`
        );
      }
    }

    // A fresh attempt supersedes any earlier unpaid order.
    const stale = await tx.order.findMany({
      where: { userId: params.userId, status: "PENDING_PAYMENT" },
    });
    for (const s of stale) {
      await tx.order.update({ where: { id: s.id }, data: { status: "CANCELLED" } });
      await tx.orderEvent.create({
        data: { orderId: s.id, status: "CANCELLED", note: "Superseded by a new checkout attempt." },
      });
    }

    const items = cart.items.map((i) => ({
      productId: i.productId,
      name: i.product.name,
      brandName: i.product.brand.name,
      sku: i.product.sku,
      unitPriceCents: i.product.priceCents,
      qty: i.qty,
    }));
    const totals = computeTotals(
      items.map((i) => ({ unitPriceCents: i.unitPriceCents, qty: i.qty })),
      params.taxCents
    );

    const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`
      SELECT nextval('order_number_seq')
    `;

    const order = await tx.order.create({
      data: {
        number: `FT-${nextval}`,
        userId: params.userId,
        status: "PENDING_PAYMENT",
        subtotalCents: totals.subtotalCents,
        shippingCents: totals.shippingCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        shipTo: params.shipTo as unknown as Prisma.InputJsonValue,
        paymentMethod: params.paymentMethod,
        statementDescriptor: STATEMENT_DESCRIPTOR,
        ipAddress: params.ce3.ipAddress ?? null,
        userAgent: params.ce3.userAgent ?? null,
        deviceHash: params.ce3.deviceHash ?? null,
        sessionId: params.ce3.sessionId ?? null,
        items: { create: items },
        events: { create: { status: "PENDING_PAYMENT" } },
      },
      include: { items: true },
    });
    return order;
  });
}

// Payment confirmation — driven by the webhook, never the browser redirect.
// Idempotent: a replay on an already-paid order is a no-op.
export async function markOrderPaid(orderId: string, paymentRef: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: true },
  });
  if (!order || order.status !== "PENDING_PAYMENT") return;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", paymentRef },
    });
    await tx.orderEvent.create({ data: { orderId: order.id, status: "PAID" } });
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.qty } },
      });
    }
    // Paid = the cart's job is done.
    const cart = await tx.cart.findUnique({ where: { userId: order.userId } });
    if (cart) await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
  });

  await sendOrderEmail(order.id, "PAID");
}

export async function transitionOrder(params: {
  orderId: string;
  next: OrderStatus;
  actorId?: string;
  carrier?: string;
  trackingNumber?: string;
  note?: string;
}): Promise<Order> {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: params.orderId } });

  assertTransition(order.status, params.next, {
    carrier: params.carrier,
    trackingNumber: params.trackingNumber,
  });

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.update({
      where: { id: order.id },
      data: {
        status: params.next,
        ...(params.next === "SHIPPED"
          ? {
              carrier: params.carrier!.trim(),
              trackingNumber: params.trackingNumber!.trim(),
            }
          : {}),
      },
    });
    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        status: params.next,
        actorId: params.actorId ?? null,
        note: params.note ?? null,
      },
    });
    return result;
  });

  await sendOrderEmail(order.id, params.next);
  return updated;
}
