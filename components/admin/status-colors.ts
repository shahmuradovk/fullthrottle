import type { OrderStatus } from "@prisma/client";

// Token values only — read from the design system, never invented.
export function statusColor(status: OrderStatus): string {
  switch (status) {
    case "PAID":
      return "var(--color-stock-in)";
    case "PREPARING":
      return "var(--color-stock-low)";
    case "PACKED":
    case "SHIPPED":
      return "var(--color-accent)";
    case "DELIVERED":
      return "var(--color-stock-in)";
    case "CANCELLED":
    case "REFUNDED":
      return "var(--color-ink-secondary)";
    default:
      return "var(--color-ink-secondary)";
  }
}
