import { readAdminSession } from "@/lib/admin/session";
import { adminSignOutAction } from "@/lib/admin/auth-actions";
import { AdminNav } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

// Same tokens as the storefront at higher density — never a second color or
// type system. Top bar is the near-black --color-admin-topbar.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readAdminSession();
  const full = session?.stage === "full";

  const navItems = [
    { label: "Overview", href: "/admin" },
    { label: "Assistant", href: "/admin/assistant" },
    { label: "Sections", href: "/admin/sections" },
    { label: "Attributes", href: "/admin/attributes" },
    { label: "Products", href: "/admin/products" },
    { label: "Orders", href: "/admin/orders" },
    { label: "Supplier", href: "/admin/supplier" },
    ...(session?.role === "OWNER" ? [{ label: "Users", href: "/admin/users" }] : []),
  ];

  return (
    <div className="flex min-h-screen flex-col text-sm">
      <header className="flex h-12 items-center gap-4 bg-admin-topbar px-6 text-ink">
        <span className="font-display text-xl font-bold">FULLTHROTTLE</span>
        <span className="rounded-1 border border-ink-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-secondary">
          Admin
        </span>
        <div className="flex-1" />
        {full && (
          <>
            <span className="font-mono text-[11px] text-ink-secondary">
              {session?.email}
            </span>
            <form action={adminSignOutAction}>
              <button
                type="submit"
                className="cursor-pointer border-none bg-transparent font-mono text-[11px] uppercase tracking-[0.06em] text-ink-secondary hover:text-ink"
              >
                Sign out
              </button>
            </form>
          </>
        )}
      </header>

      {full ? (
        <div className="grid flex-1 md:grid-cols-[190px_1fr]">
          <AdminNav items={navItems} />
          <main className="min-w-0 p-7">{children}</main>
        </div>
      ) : (
        <main className="flex flex-1 items-center justify-center p-7">{children}</main>
      )}
    </div>
  );
}
