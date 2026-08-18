import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/guard";
import { LOW_STOCK_THRESHOLD } from "@/lib/supplier/availability";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  await requireAdmin();

  const [toPack, lowStock] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: ["PAID", "PREPARING"] } },
      include: { items: true },
      orderBy: { createdAt: "asc" },
      take: 8,
    }),
    prisma.product.findMany({
      where: {
        supplySource: "MANUAL",
        stock: { gt: 0, lte: LOW_STOCK_THRESHOLD },
        active: true,
      },
      orderBy: { stock: "asc" },
      take: 8,
    }),
  ]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div>
      <h1 className="mb-4 font-display text-[28px] font-bold uppercase text-ink">
        Today — {today}
      </h1>
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
        <section className="rounded-1 border border-line bg-surface">
          <p className="type-label border-b-[1.5px] border-ink px-4 py-2.5 text-ink-secondary">
            To pack — {toPack.length} {toPack.length === 1 ? "order" : "orders"}
          </p>
          {toPack.length === 0 ? (
            <p className="px-4 py-5 text-[13px] text-ink-secondary">
              Nothing waiting. Paid orders land here the moment the webhook confirms
              them.
            </p>
          ) : (
            toPack.map((o) => (
              <div
                key={o.id}
                className="grid grid-cols-[110px_1fr_110px_60px] items-center gap-2.5 border-b border-line px-4 py-2.5 max-md:grid-cols-2"
              >
                <span className="font-mono text-xs">{o.number}</span>
                <span className="truncate text-sm">
                  {o.items.map((i) => i.name).join(" + ")}
                </span>
                <span className="font-mono text-[11px] text-ink-secondary">
                  {formatMoney(o.totalCents)}
                </span>
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="justify-self-end text-[13px] !text-link hover:underline"
                >
                  Open
                </Link>
              </div>
            ))
          )}
        </section>

        <section className="rounded-1 border border-line bg-surface">
          <p className="type-label border-b-[1.5px] border-ink px-4 py-2.5 text-ink-secondary">
            Low stock — set reorder or hide
          </p>
          {lowStock.length === 0 ? (
            <p className="px-4 py-5 text-[13px] text-ink-secondary">
              Nothing running low right now.
            </p>
          ) : (
            lowStock.map((p) => (
              <Link
                key={p.id}
                href={`/admin/products/${p.id}`}
                className="flex items-center justify-between gap-2.5 border-b border-line px-4 py-2.5 !no-underline hover:bg-bg"
              >
                <span className="font-mono text-xs !text-ink">{p.sku}</span>
                <span className="font-mono text-xs text-stock-low">{p.stock} LEFT</span>
              </Link>
            ))
          )}
          <p className="px-4 py-2.5 text-xs text-ink-secondary">
            Counts are manual until the supplier sync connects.
          </p>
        </section>
      </div>
    </div>
  );
}
