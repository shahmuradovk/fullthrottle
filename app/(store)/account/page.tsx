import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/customer";
import { formatMoney } from "@/lib/money";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { statusColor } from "@/components/admin/status-colors";

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage() {
  const user = await requireUser("/account");
  const orders = await prisma.order.findMany({
    where: { userId: user.id, status: { not: "PENDING_PAYMENT" } },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        body="When you place one, its live status and tracking land here."
        action={
          <Button variant="secondary" asChildHref="/">
            Browse the catalog
          </Button>
        }
      />
    );
  }

  return (
    <div className="rounded-1 border border-line bg-surface">
      <div className="grid grid-cols-[130px_1fr_130px_110px_90px] gap-3 border-b-[1.5px] border-ink px-5 py-3 max-md:hidden">
        {["Order", "Items", "Status", "Total", ""].map((h, i) => (
          <span key={i} className="type-label text-ink-secondary">
            {h}
          </span>
        ))}
      </div>
      {orders.map((o) => (
        <div
          key={o.id}
          className="grid grid-cols-[130px_1fr_130px_110px_90px] items-center gap-3 border-b border-line px-5 py-4 max-md:grid-cols-2"
        >
          <div>
            <p className="font-mono text-[13px] text-ink">{o.number}</p>
            <p className="font-mono text-[11px] uppercase text-ink-secondary">
              {o.createdAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <span className="truncate text-sm text-ink">
            {o.items.map((i) => `${i.brandName} ${i.name}`).join(" + ")}
          </span>
          <span
            className="justify-self-start rounded-1 border px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.06em]"
            style={{ color: statusColor(o.status), borderColor: statusColor(o.status) }}
          >
            {o.status.replace("_", " ")}
          </span>
          <span className="font-mono text-sm text-ink">{formatMoney(o.totalCents)}</span>
          <Link
            href={`/account/orders/${o.id}`}
            className="justify-self-end text-sm !text-link hover:underline"
          >
            Track
          </Link>
        </div>
      ))}
    </div>
  );
}
