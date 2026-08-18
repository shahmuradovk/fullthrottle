import Link from "next/link";
import { cn } from "@/lib/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet" | "destructive";
  size?: "default" | "small";
  full?: boolean;
  asChildHref?: string; // render as a Link styled like a button
};

const variants = {
  primary:
    "bg-accent text-accent-ink border-none hover:brightness-95 disabled:bg-disabled disabled:text-ink-secondary disabled:hover:brightness-100",
  secondary:
    "bg-transparent text-ink border-[1.5px] border-ink hover:bg-surface-hover disabled:text-ink-secondary disabled:border-line disabled:hover:bg-transparent",
  quiet:
    "bg-transparent text-accent border-none underline underline-offset-[3px] hover:text-ink disabled:text-ink-secondary",
  destructive:
    "bg-error text-surface border-none hover:brightness-95 disabled:bg-disabled disabled:text-ink-secondary disabled:hover:brightness-100",
};

const sizes = {
  default: "text-[15px] px-5 py-[11px]",
  small: "text-sm px-3.5 py-2",
};

export function Button({
  variant = "primary",
  size = "default",
  full,
  className,
  type,
  asChildHref,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 font-body font-semibold rounded-1 cursor-pointer transition-[background,color,filter] duration-(--dur-fast) disabled:cursor-not-allowed",
    variants[variant],
    sizes[size],
    full && "flex w-full",
    className
  );

  if (asChildHref) {
    return (
      <Link href={asChildHref} className={cn(classes, "!no-underline", variant === "primary" && "!text-accent-ink", variant === "secondary" && "!text-ink")}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type ?? "button"} className={classes} {...props}>
      {children}
    </button>
  );
}
