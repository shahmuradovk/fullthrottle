import Link from "next/link";
import type { Section } from "@prisma/client";
import { NavLinks } from "./nav-links";

export function StoreHeader({
  sections,
  cartCount,
  userName,
}: {
  sections: Section[];
  cartCount: number;
  userName?: string | null;
}) {
  const links = sections.map((s) => ({ name: s.name, href: `/${s.slug}` }));
  return (
    <>
    <header className="flex h-16 items-center gap-7 border-b border-line bg-surface px-5 md:px-10">
      <Link
        href="/"
        className="font-display text-[26px] font-bold tracking-[0.01em] !text-ink !no-underline"
      >
        FULLTHROTTLE
      </Link>
      <div className="hidden md:block">
        <NavLinks links={links} />
      </div>
      <form action="/search" className="ml-auto hidden min-w-32 max-w-[380px] flex-1 md:block">
        <label htmlFor="site-search" className="sr-only">
          Search part number or name
        </label>
        <div className="flex items-center gap-2.5 rounded-1 border border-line bg-bg px-3">
          <span aria-hidden className="font-mono text-xs text-ink-secondary">
            ⌕
          </span>
          <input
            id="site-search"
            name="q"
            type="search"
            placeholder="Search part number or name"
            className="w-full bg-transparent py-2 text-sm text-ink outline-none placeholder:text-ink-secondary"
          />
        </div>
      </form>
      <div className="ml-auto flex items-center gap-5 md:ml-0">
        <Link
          href={userName ? "/account" : "/sign-in"}
          className="text-[15px] font-medium !text-ink !no-underline hover:!text-ink-secondary"
        >
          {userName ? userName.split(" ")[0] : "Sign in"}
        </Link>
        <Link
          href="/cart"
          className="text-[15px] font-medium !text-ink !no-underline hover:!text-ink-secondary"
        >
          Cart ({cartCount})
        </Link>
      </div>
    </header>
    {/* Mobile: sections + search ride a scrollable row under the header */}
    <div className="border-b border-line bg-surface px-5 md:hidden">
      <NavLinks links={[...links, { name: "⌕ Search", href: "/search" }]} compact />
    </div>
    </>
  );
}
