import { cn } from "@/lib/cn";

// Toast — the one inverted surface in the system: Bone on dark, so it reads
// as a physical tag clipped over the page.
export function Toast({
  message,
  action,
  className,
}: {
  message: string;
  action?: { label: string; href?: string; onClick?: () => void };
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-3 rounded-1 bg-ink px-4 py-3 text-bg shadow-(--shadow-pop)",
        className
      )}
    >
      <span className="flex-1 text-sm">{message}</span>
      {action &&
        (action.href ? (
          <a
            href={action.href}
            className="text-sm font-semibold !text-[#9C3A12] underline underline-offset-[3px]"
          >
            {action.label}
          </a>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="cursor-pointer text-sm font-semibold text-[#9C3A12] hover:underline"
          >
            {action.label}
          </button>
        ))}
    </div>
  );
}
