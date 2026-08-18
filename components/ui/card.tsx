import { cn } from "@/lib/cn";

// Cards are flat sheets: 1 px Trace border, 2 px radius, no shadow
// (design plan Part 6, rule 4).
export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "aside";
}) {
  return (
    <Tag className={cn("bg-surface border border-line rounded-1", className)}>
      {children}
    </Tag>
  );
}
