import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOrdersAdmin } from "@/lib/admin/guard";
import { formatMoney } from "@/lib/money";
import { EmptyState } from "@/components/ui/empty-state";
import { statusColor } from "@/components/admin/status-colors";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  await requireOrdersAdmin();
  const orders = await prisma.order.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1 className="mb-4 font-display text-[28px] font-bold text-ink">ORDERS</h1>
      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          body="Orders land here as PAID the moment the payment webhook confirms them."
        />
      ) : (
        <div className="rounded-1 border border-line bg-surface">
          <div className="grid grid-cols-[110px_1fr_130px_100px] gap-2.5 border-b-[1.5px] border-ink px-4 py-2.5 max-md:hidden">
            {["Order", "Customer", "Status", "Total"].map((h) => (
              <span key={h} className="type-label text-ink-secondary">
                {h}
              </span>
            ))}
          </div>
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/admin/orders/${o.id}`}
              className="grid grid-cols-[110px_1fr_130px_100px] items-center gap-2.5 border-b border-line px-4 py-2.5 !no-underline hover:bg-bg max-md:grid-cols-2"
            >
              <span className="font-mono text-xs !text-ink">{o.number}</span>
              <span className="truncate text-sm !text-ink">{o.user.name}</span>
              <span
                className="justify-self-start rounded-1 border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.05em]"
                style={{ color: statusColor(o.status), borderColor: statusColor(o.status) }}
              >
                {o.status.replace("_", " ")}
              </span>
              <span className="font-mono text-xs !text-ink">{formatMoney(o.totalCents)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
