"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function AdminNav({ items }: { items: { label: string; href: string }[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Admin"
      className="flex flex-col gap-px border-r border-line bg-surface py-4"
    >
      {items.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "border-l-[3px] px-4 py-2 text-sm !no-underline",
              active
                ? "border-accent bg-bg font-semibold !text-ink"
                : "border-transparent font-medium !text-ink-secondary hover:!text-ink"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
