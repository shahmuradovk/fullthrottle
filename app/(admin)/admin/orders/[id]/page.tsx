import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrdersAdmin } from "@/lib/admin/guard";
import { formatMoney } from "@/lib/money";
import { buildTimeline, nextForwardStatus } from "@/lib/order-timeline";
import { Timeline } from "@/components/ui/timeline";
import { statusColor } from "@/components/admin/status-colors";
import { TransitionPanel } from "./transition-panel";
import type { ShipTo } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOrdersAdmin();
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: true,
      items: true,
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();

  const shipTo = order.shipTo as unknown as ShipTo;
  const next = order.status === "PENDING_PAYMENT" ? null : nextForwardStatus(order.status);
  const canCancel = ["PAID", "PREPARING"].includes(order.status);
  const isTerminal = ["CANCELLED", "REFUNDED", "PENDING_PAYMENT"].includes(order.status);

  return (
    <div>
      <Link
        href="/admin/orders"
        className="mb-1.5 inline-block font-mono text-[11px] !text-ink-secondary hover:!text-ink"
      >
        ← All orders
      </Link>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-[28px] font-bold text-ink">
          ORDER {order.number}
        </h1>
        <span className="font-mono text-[11px] uppercase text-ink-secondary">
          {order.status === "PENDING_PAYMENT" ? "Awaiting payment" : ""}
          {order.events.find((e) => e.status === "PAID")
            ? `Paid ${order.events
                .find((e) => e.status === "PAID")!
                .createdAt.toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}`
            : ""}
        </span>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_400px]">
        <div className="flex flex-col gap-5">
          <div className="rounded-1 border border-line bg-surface p-5">
            {isTerminal ? (
              <p
                className="rounded-1 border px-3 py-2 font-mono text-xs uppercase tracking-[0.05em]"
                style={{ color: statusColor(order.status), borderColor: statusColor(order.status) }}
              >
                {order.status.replace("_", " ")}
              </p>
            ) : (
              <Timeline steps={buildTimeline(order, order.events)} />
            )}
          </div>

          <div className="rounded-1 border border-line bg-surface">
            <p className="type-label border-b-[1.5px] border-ink px-4 py-2.5 text-ink-secondary">
              Items
            </p>
            {order.items.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5"
              >
                <div>
                  <p className="text-sm text-ink">
                    {i.brandName} {i.name} × {i.qty}
                  </p>
                  <p className="font-mono text-[11px] text-ink-secondary">{i.sku}</p>
                </div>
                <span className="font-mono text-[13px] text-ink">
                  {formatMoney(i.unitPriceCents * i.qty)}
                </span>
              </div>
            ))}
            <div className="flex flex-col gap-1.5 px-4 py-3">
              {[
                ["Subtotal", formatMoney(order.subtotalCents)],
                ["Shipping", order.shippingCents === 0 ? "Free" : formatMoney(order.shippingCents)],
                ["Tax", formatMoney(order.taxCents)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-[13px] text-ink-secondary">
                  <span>{k}</span>
                  <span className="font-mono">{v}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-line pt-2 text-sm font-semibold text-ink">
                <span>Total</span>
                <span className="font-mono">{formatMoney(order.totalCents)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3.5 rounded-1 border border-line bg-surface p-5">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-sm font-medium text-ink">{order.number}</span>
            <span className="font-mono text-[11px] uppercase text-ink-secondary">
              {order.paymentMethod.replace("_", " ")}
              {order.paymentRef ? ` · ${order.paymentRef.slice(0, 18)}` : ""}
            </span>
          </div>
          <p className="text-sm text-ink">
            {order.user.name} · {order.user.contactEmail ?? order.user.email}
          </p>
          <div className="rounded-1 border border-line p-3 text-sm leading-relaxed text-ink">
            {shipTo.line1}
            {shipTo.line2 ? `, ${shipTo.line2}` : ""}
            <br />
            {shipTo.city}, {shipTo.state} {shipTo.zip}
            {shipTo.phone && (
              <>
                <br />
                <span className="font-mono text-xs text-ink-secondary">{shipTo.phone}</span>
              </>
            )}
          </div>
          {order.trackingNumber && (
            <p className="font-mono text-xs text-ink">
              {order.carrier} · {order.trackingNumber}
            </p>
          )}
          <TransitionPanel orderId={order.id} next={next} canCancel={canCancel} />
        </div>
      </div>
    </div>
  );
}
