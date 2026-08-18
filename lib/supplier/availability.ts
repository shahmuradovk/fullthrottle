import type { StockState } from "@/components/ui/stock-badge";

export const LOW_STOCK_THRESHOLD = 3; // >3 in stock · 1–3 low stock · 0 out

export type Availability = {
  inStock: boolean;
  qty: number;
  state: StockState;
  label: string;
  shipLine: string;
};

type StockSource = {
  supplySource: "MANUAL" | "SUPPLIER";
  stock: number;
  supplierStock?: number | null;
};

// The single stock resolver (engineering brief §9). Product pages, listing
// cards, cart and checkout all read stock through this function; when the
// supplier connects, the second branch activates and no screen changes.
export function getAvailability(p: StockSource): Availability {
  if (p.supplySource === "SUPPLIER") {
    const qty = p.supplierStock ?? 0;
    if (qty > 0) {
      return {
        inStock: true,
        qty,
        state: "supplier",
        label: "Ships from supplier · 2–4 days",
        shipLine: "Leaves supplier warehouse in 2–4 days",
      };
    }
    return {
      inStock: false,
      qty: 0,
      state: "out",
      label: "Out of stock",
      shipLine: "No restock date yet",
    };
  }

  const qty = p.stock;
  if (qty > LOW_STOCK_THRESHOLD) {
    return {
      inStock: true,
      qty,
      state: "in",
      label: "In stock",
      shipLine: "Order by 2 pm ET — ships today",
    };
  }
  if (qty > 0) {
    return {
      inStock: true,
      qty,
      state: "low",
      label: `Low stock · ${qty} left`,
      shipLine: "Order by 2 pm ET — ships today",
    };
  }
  return {
    inStock: false,
    qty: 0,
    state: "out",
    label: "Out of stock",
    shipLine: "No restock date yet",
  };
}
