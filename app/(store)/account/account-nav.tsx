"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const items = [
  { label: "Orders", href: "/account" },
  { label: "Addresses", href: "/account/addresses" },
  { label: "Profile", href: "/account/profile" },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account" className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active =
          item.href === "/account"
            ? pathname === "/account" || pathname.startsWith("/account/orders")
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-1 px-3.5 py-2.5 text-[15px] !no-underline",
              active
                ? "border border-line border-l-[3px] border-l-accent bg-surface font-semibold !text-ink"
                : "font-medium !text-ink-secondary hover:!text-ink"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
