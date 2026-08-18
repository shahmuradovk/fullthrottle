"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function NavLinks({
  links,
  compact,
}: {
  links: { name: string; href: string }[];
  compact?: boolean;
}) {
  const pathname = usePathname();
  return (
    <nav
      className={cn("flex gap-5", compact && "overflow-x-auto")}
      aria-label="Sections"
    >
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "px-0.5 text-[15px] font-medium !no-underline border-b-2 transition-colors duration-(--dur-fast) whitespace-nowrap",
              compact ? "py-2.5" : "py-5",
              active
                ? "!text-ink border-ink"
                : "!text-ink-secondary border-transparent hover:!text-ink"
            )}
          >
            {l.name}
          </Link>
        );
      })}
    </nav>
  );
}
