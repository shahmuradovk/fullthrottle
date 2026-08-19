"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Live account + cart links. The header itself is cache-friendly; this
// island fetches the cookie-derived bits after paint and refreshes on
// navigation, tab focus, and the ft:cart-updated event cart actions fire.
export function HeaderSession() {
  const pathname = usePathname();
  const [summary, setSummary] = useState<{ name: string | null; cartCount: number }>({
    name: null,
    cartCount: 0,
  });

  const refresh = useCallback(() => {
    fetch("/api/session-summary", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSummary(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("ft:cart-updated", refresh);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("ft:cart-updated", refresh);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return (
    <>
      <Link
        href={summary.name ? "/account" : "/sign-in"}
        className="text-[15px] font-medium !text-ink !no-underline hover:!text-ink-secondary"
      >
        {summary.name ? summary.name.split(" ")[0] : "Sign in"}
      </Link>
      <Link
        href="/cart"
        className="text-[15px] font-medium !text-ink !no-underline hover:!text-ink-secondary"
      >
        Cart ({summary.cartCount})
      </Link>
    </>
  );
}
