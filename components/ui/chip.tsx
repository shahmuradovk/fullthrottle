import { cn } from "@/lib/cn";

type ChipProps = {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  removeLabel?: string; // accessible name for the × control
  className?: string;
};

// Filter chip — the only pill-radius element besides the fiche callout.
// Active chips are Fuel orange with a removable ×; inactive chips are outlined.
// Pass either onClick (whole chip toggles) or onRemove (chip is static, the ×
// removes it) — never both, a button cannot nest a button.
export function Chip({ children, active, onClick, onRemove, removeLabel, className }: ChipProps) {
  const Tag = onClick && !onRemove ? "button" : "span";
  return (
    <Tag
      {...(Tag === "button" ? { type: "button" as const, onClick } : {})}
      className={cn(
        "inline-flex items-center gap-2 rounded-pill font-mono text-xs transition-[border-color,background] duration-(--dur-fast)",
        active
          ? "bg-accent text-accent-ink py-1.5 pl-3 " + (onRemove ? "pr-1.5" : "pr-3")
          : "bg-surface text-ink border border-line px-3 py-1.5",
        onClick && !active && "cursor-pointer hover:border-ink",
        className
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? "Remove filter"}
          className="grid size-4 cursor-pointer place-items-center rounded-pill bg-accent-ink/25 leading-none"
        >
          ×
        </button>
      )}
    </Tag>
  );
}
