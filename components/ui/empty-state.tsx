import { cn } from "@/lib/cn";

// An empty screen is an invitation to act, not a shrug.
export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2.5 rounded-1 border border-dashed border-line px-5 py-7 text-center",
        className
      )}
    >
      <p className="font-display text-[22px] font-semibold leading-tight text-ink">{title}</p>
      {body && <p className="type-small text-ink-secondary">{body}</p>}
      {action}
    </div>
  );
}
