import { cn } from "@/lib/cn";

// A single loading bar. Compose inside a container with `animate-pulse-ft`
// so the whole group pulses together (one 1.6 s opacity pulse; killed by
// prefers-reduced-motion).
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rounded-1 bg-well", className)} />;
}

// Ready-made card-shaped skeleton used by product grids.
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex animate-pulse-ft flex-col gap-2.5 rounded-1 border border-line p-4",
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <Skeleton className="h-[110px]" />
      <Skeleton className="h-3 w-[55%]" />
      <Skeleton className="h-3 w-[80%]" />
      <Skeleton className="h-3 w-[35%]" />
    </div>
  );
}
