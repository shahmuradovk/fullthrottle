import type { Order, OrderEvent, OrderStatus } from "@prisma/client";
import type { TimelineStep } from "@/components/ui/timeline";

const FLOW: OrderStatus[] = ["PAID", "PREPARING", "PACKED", "SHIPPED", "DELIVERED"];

const LABELS: Record<string, string> = {
  PAID: "Paid",
  PREPARING: "Preparing",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
};

function shortDate(d: Date): string {
  return d
    .toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    .toUpperCase();
}

// Customer and admin timelines render from the same OrderEvent list
// (engineering brief §8) — this is the single mapper both use.
export function buildTimeline(
  order: Pick<Order, "status" | "carrier" | "trackingNumber">,
  events: Pick<OrderEvent, "status" | "createdAt">[]
): TimelineStep[] {
  const currentIndex = FLOW.indexOf(order.status as (typeof FLOW)[number]);
  const isTerminal = order.status === "CANCELLED" || order.status === "REFUNDED";
  const reachedAll = order.status === "DELIVERED";

  return FLOW.map((status, i) => {
    const event = events.find((e) => e.status === status);
    const done =
      Boolean(event) && (reachedAll || i < currentIndex || (isTerminal && Boolean(event)));
    const current = !isTerminal && i === currentIndex && !reachedAll;

    let sublabel: string | undefined;
    if (event) sublabel = shortDate(event.createdAt);
    else if (status === "SHIPPED" && !order.trackingNumber) {
      sublabel = current ? undefined : "Tracking no. appears here";
    }
    if (status === "SHIPPED" && order.trackingNumber && (done || current)) {
      sublabel = `${order.carrier} · ${order.trackingNumber}`;
    }

    return {
      label: LABELS[status],
      sublabel,
      state: current ? ("current" as const) : done ? ("done" as const) : ("upcoming" as const),
    };
  });
}

export function nextForwardStatus(status: OrderStatus): OrderStatus | null {
  const i = FLOW.indexOf(status as (typeof FLOW)[number]);
  if (i === -1 || i === FLOW.length - 1) return null;
  return FLOW[i + 1];
}
