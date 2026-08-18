import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/customer";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import type { ShipTo } from "@/lib/orders";

export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, string> = {
  CARD: "Card",
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
  PAYPAL: "PayPal",
};

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/checkout/confirmation/${id}`);
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, events: { orderBy: { createdAt: "asc" } } },
  });
  if (!order || order.userId !== user.id) notFound();

  const shipTo = order.shipTo as unknown as ShipTo;
  const pending = order.status === "PENDING_PAYMENT";
  const paidEvent = order.events.find((e) => e.status === "PAID");

  return (
    <main className="flex justify-center px-5 py-16">
      {pending && <meta httpEquiv="refresh" content="4" />}
      <div className="flex w-[520px] max-w-full flex-col gap-4 rounded-1 border border-line bg-surface p-9">
        <div className="flex items-center gap-3.5">
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-pill text-[17px] ${
              pending ? "border-2 border-accent text-accent" : "bg-stock-in text-surface"
            }`}
          >
            {pending ? "…" : "✓"}
          </span>
          <div>
            <h1 className="font-display text-[32px] font-bold leading-none text-ink">
              {pending ? "CONFIRMING PAYMENT" : "ORDER PLACED"}
            </h1>
            <p className="mt-1 font-mono text-xs text-ink-secondary">
              {order.number} · {formatMoney(order.totalCents)} ·{" "}
              {METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}
            </p>
          </div>
        </div>

        {pending ? (
          <p className="text-[15px] leading-relaxed text-ink-secondary">
            Waiting for the payment provider to confirm — this page refreshes itself.
            Closing the tab is safe: the order completes either way and the receipt
            goes to your email.
          </p>
        ) : (
          <p className="text-[15px] leading-relaxed text-ink">
            The receipt and every status change go to{" "}
            <span className="font-mono text-[13px]">{user.contactEmail ?? user.email}</span>
            {user.emailVerified ? "." : " — confirm your email from your profile so they reach you."}
          </p>
        )}

        <dl className="flex flex-col gap-2 rounded-1 border border-line p-4">
          <div className="flex gap-3 text-sm">
            <dt className="type-label w-20 shrink-0 text-ink-secondary">Status</dt>
            <dd
              className={`m-0 font-mono text-xs uppercase ${pending ? "text-accent" : "text-stock-in"}`}
            >
              {pending
                ? "Awaiting confirmation"
                : `Paid — ${(paidEvent?.createdAt ?? order.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`}
            </dd>
          </div>
          <div className="flex gap-3 text-sm">
            <dt className="type-label w-20 shrink-0 text-ink-secondary">Next</dt>
            <dd className="m-0">
              Preparing → Packed → Shipped (tracking number arrives then)
            </dd>
          </div>
          <div className="flex gap-3 text-sm">
            <dt className="type-label w-20 shrink-0 text-ink-secondary">To</dt>
            <dd className="m-0">
              {shipTo.line1}
              {shipTo.line2 ? `, ${shipTo.line2}` : ""}, {shipTo.city}, {shipTo.state}{" "}
              {shipTo.zip}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2.5">
          <Button asChildHref={`/account/orders/${order.id}`}>Track this order</Button>
          <Button variant="secondary" asChildHref="/">
            Keep browsing
          </Button>
        </div>
      </div>
    </main>
  );
}
