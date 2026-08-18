import { cn } from "@/lib/cn";
import { Field } from "./field";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  mono?: boolean; // SKUs, card numbers, ZIP — anything that belongs in a catalog column
};

export function Input({ id, label, hint, error, mono, className, ...props }: InputProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(
          "w-full rounded-1 px-3 py-2.5 text-[15px] text-ink bg-surface transition-[border-color,background] duration-(--dur-fast)",
          mono && "font-mono text-sm",
          error
            ? "bg-error-bg border-[1.5px] border-error"
            : "border border-line hover:border-ink-secondary",
          className
        )}
        {...props}
      />
    </Field>
  );
}
