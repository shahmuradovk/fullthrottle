import { cn } from "@/lib/cn";

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  id: string;
  label: string;
};

export function Checkbox({ id, label, className, ...props }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "inline-flex items-center gap-2.5 text-[15px] text-ink cursor-pointer",
        className
      )}
    >
      <input id={id} type="checkbox" className="peer sr-only" {...props} />
      <span
        aria-hidden
        className="grid size-4 shrink-0 place-items-center rounded-1 border-[1.5px] border-ink bg-surface text-[11px] leading-none text-transparent transition-[background] duration-(--dur-fast) peer-checked:bg-accent peer-checked:text-accent-ink peer-focus-visible:[box-shadow:var(--focus-ring)] peer-disabled:border-line"
      >
        ✓
      </span>
      {label}
    </label>
  );
}
