import { cn } from "@/lib/cn";

export type StockState = "in" | "low" | "supplier" | "out";

// Stock states are text badges, never bare dots (design plan Part 6, rule 2).
const styles: Record<StockState, string> = {
  in: "text-stock-in border border-stock-in",
  low: "text-stock-low border border-stock-low",
  supplier: "text-accent border border-accent",
  out: "text-stock-out border border-dashed border-stock-out",
};

export function stockLabel(state: StockState, qty?: number): string {
  switch (state) {
    case "in":
      return "In stock";
    case "low":
      return qty !== undefined ? `Low stock · ${qty} left` : "Low stock";
    case "supplier":
      return "Ships from supplier · 2–4 days";
    case "out":
      return "Out of stock";
  }
}

export function StockBadge({
  state,
  qty,
  className,
}: {
  state: StockState;
  qty?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-1 px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.06em]",
        styles[state],
        className
      )}
    >
      {stockLabel(state, qty)}
    </span>
  );
}
