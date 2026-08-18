import { cn } from "@/lib/cn";

// The signature element: a circled reference number borrowed from exploded
// parts diagrams. Appears on product cards, spec rows, checkout steps and the
// order timeline.
export function Callout({
  n,
  filled,
  className,
}: {
  n: number | string;
  filled?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-[22px] shrink-0 items-center justify-center rounded-pill font-mono text-[11px]",
        filled
          ? "bg-accent text-accent-ink"
          : "border-[1.5px] border-accent text-accent",
        className
      )}
    >
      {n}
    </span>
  );
}
