import { cn } from "@/lib/cn";
import { Field } from "./field";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
};

export function Select({
  id,
  label,
  hint,
  error,
  options,
  placeholder,
  className,
  ...props
}: SelectProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(
          "w-full rounded-1 px-3 py-2.5 text-[15px] text-ink bg-surface transition-[border-color] duration-(--dur-fast)",
          error
            ? "bg-error-bg border-[1.5px] border-error"
            : "border border-line hover:border-ink-secondary",
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
