import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/customer";
import { formatMoney } from "@/lib/money";
import { buildTimeline } from "@/lib/order-timeline";
import { Timeline } from "@/components/ui/timeline";
import { statusColor } from "@/components/admin/status-colors";
import type { ShipTo } from "@/lib/orders";
import { productArt } from "@/lib/product-art";

export const dynamic = "force-dynamic";

const CARRIER_LINKS: Record<string, (t: string) => string> = {
  UPS: (t) => `https://www.ups.com/track?tracknum=${encodeURIComponent(t)}`,
  FedEx: (t) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(t)}`,
  USPS: (t) =>
    `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(t)}`,
};

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/account/orders/${id}`);
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, events: { orderBy: { createdAt: "asc" } } },
  });
  if (!order || order.userId !== user.id) notFound();

  // Order items are immutable snapshots — the live product is only consulted
  // for its illustration, and may legitimately be gone.
  const liveProducts = await prisma.product.findMany({
    where: { id: { in: order.items.map((i) => i.productId) } },
    select: { id: true, slug: true },
  });
  const slugById = Object.fromEntries(liveProducts.map((p) => [p.id, p.slug]));

  const shipTo = order.shipTo as unknown as ShipTo;
  const itemCount = order.items.reduce((s, i) => s + i.qty, 0);
  const isTerminal = ["CANCELLED", "REFUNDED", "PENDING_PAYMENT"].includes(order.status);
  const trackingHref =
    order.carrier && order.trackingNumber
      ? CARRIER_LINKS[order.carrier]?.(order.trackingNumber)
      : undefined;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-[32px] font-bold text-ink">
          ORDER {order.number}
        </h2>
        <span className="font-mono text-xs uppercase text-ink-secondary">
          Placed{" "}
          {order.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ·{" "}
          {itemCount} {itemCount === 1 ? "item" : "items"} · {formatMoney(order.totalCents)}
        </span>
      </div>

      <div className="rounded-1 border border-line bg-surface p-7">
        {isTerminal ? (
          <p
            className="inline-block rounded-1 border px-3 py-2 font-mono text-xs uppercase tracking-[0.05em]"
            style={{ color: statusColor(order.status), borderColor: statusColor(order.status) }}
          >
            {order.status === "PENDING_PAYMENT"
              ? "Awaiting payment confirmation"
              : order.status.replace("_", " ")}
          </p>
        ) : (
          <Timeline steps={buildTimeline(order, order.events)} />
        )}
        <div className="mt-7 flex flex-wrap items-center gap-4 border-t border-line pt-5">
          <span className="type-label text-ink-secondary">Carrier</span>
          {order.trackingNumber ? (
            <>
              <span className="font-mono text-sm text-ink">
                {order.carrier} · {order.trackingNumber}
              </span>
              {trackingHref && (
                <a href={trackingHref} target="_blank" rel="noopener noreferrer" className="text-sm">
                  Open {order.carrier} tracking
                </a>
              )}
            </>
          ) : (
            <span className="text-sm text-ink-secondary">
              Tracking number appears here when the order ships — you’ll also get it by
              email.
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-1 border border-line bg-surface">
          {order.items.map((i) => (
            <div
              key={i.id}
              className="flex items-center gap-3.5 border-b border-line px-5 py-4"
            >
              {(() => {
                const art = slugById[i.productId]
                  ? productArt(slugById[i.productId])
                  : null;
                return art ? (
                  <div className="flex h-14 w-[70px] shrink-0 items-center justify-center rounded-1 border border-line bg-well-deep">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={art} alt="" className="h-full w-full object-contain p-1" />
                  </div>
                ) : (
                  <div className="img-placeholder h-14 w-[70px] shrink-0 rounded-1 border border-line" />
                );
              })()}
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-ink">
                  {i.brandName} {i.name}
                </p>
                <p className="font-mono text-[11px] uppercase text-ink-secondary">
                  {i.sku} · Qty {i.qty}
                </p>
              </div>
              <span className="font-mono text-sm text-ink">
                {formatMoney(i.unitPriceCents * i.qty)}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 rounded-1 border border-line bg-surface p-5">
          <span className="type-label text-ink-secondary">Delivers to</span>
          <p className="text-[15px] leading-relaxed text-ink">
            {shipTo.name}
            <br />
            {shipTo.line1}
            {shipTo.line2 ? `, ${shipTo.line2}` : ""}
            <br />
            {shipTo.city}, {shipTo.state} {shipTo.zip}
          </p>
          <a href="mailto:help@fullthrottle.com" className="mt-1 text-sm">
            Something wrong? Contact us
          </a>
        </div>
      </div>
    </div>
  );
}
