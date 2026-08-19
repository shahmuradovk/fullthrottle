import Link from "next/link";
import { readCart } from "@/lib/cart";
import { computeTotals } from "@/lib/pricing";
import { formatMoney } from "@/lib/money";
import { getAvailability } from "@/lib/supplier/availability";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { removeFromCartAction, setCartQtyAction } from "./actions";
import { productArt } from "@/lib/product-art";

export const dynamic = "force-dynamic";

const noteColor: Record<string, string> = {
  in: "text-stock-in",
  low: "text-stock-low",
  supplier: "text-accent",
  out: "text-error",
};

export default async function CartPage() {
  const cart = await readCart();
  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-[720px] px-5 py-14 md:px-10">
        <h1 className="mb-6 font-display text-[40px] font-bold text-ink">CART</h1>
        <EmptyState
          title="Your cart is empty"
          body="Pick a section and add a part — guests can fill a cart freely."
          action={
            <Button variant="secondary" asChildHref="/">
              Browse the catalog
            </Button>
          }
        />
      </main>
    );
  }

  const totals = computeTotals(
    items.map((i) => ({ unitPriceCents: i.product.priceCents, qty: i.qty }))
  );
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <main className="mx-auto max-w-[1200px] px-5 py-10 md:px-10">
      <h1 className="mb-6 font-display text-[40px] font-bold text-ink">
        CART{" "}
        <span className="font-mono text-sm font-normal text-ink-secondary">
          · {count} {count === 1 ? "item" : "items"}
        </span>
      </h1>
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-1 border border-line bg-surface">
          {items.map((item) => {
            const availability = getAvailability(item.product);
            const note =
              availability.state === "in"
                ? `In stock — ${availability.qty} on hand`
                : availability.label;
            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center gap-4 border-b border-line p-5"
              >
                <div
                  className={`flex h-[90px] w-[110px] shrink-0 items-center justify-center rounded-1 border border-line ${productArt(item.product.slug) ? "bg-well-deep" : "img-placeholder"}`}
                >
                  {productArt(item.product.slug) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={productArt(item.product.slug)!}
                      alt=""
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <span className="font-mono text-[10px] text-ink-secondary">photo</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 basis-48">
                  <p className="type-label text-ink-secondary">{item.product.sku}</p>
                  <Link
                    href={`/product/${item.product.slug}`}
                    className="my-0.5 block text-lg font-semibold !text-ink !no-underline hover:underline"
                  >
                    {item.product.brand.name} {item.product.name}
                  </Link>
                  <p className={`font-mono text-xs ${noteColor[availability.state]}`}>
                    {note}
                  </p>
                </div>
                <div className="flex h-10 items-center self-center rounded-1 border border-line bg-surface">
                  <form action={setCartQtyAction}>
                    <input type="hidden" name="productId" value={item.productId} />
                    <input type="hidden" name="qty" value={item.qty - 1} />
                    <button
                      type="submit"
                      aria-label={`Decrease quantity of ${item.product.name}`}
                      className="h-10 w-[34px] cursor-pointer border-none bg-transparent text-base text-ink"
                    >
                      −
                    </button>
                  </form>
                  <span className="w-7 text-center font-mono text-sm">{item.qty}</span>
                  <form action={setCartQtyAction}>
                    <input type="hidden" name="productId" value={item.productId} />
                    <input type="hidden" name="qty" value={item.qty + 1} />
                    <button
                      type="submit"
                      aria-label={`Increase quantity of ${item.product.name}`}
                      className="h-10 w-[34px] cursor-pointer border-none bg-transparent text-base text-ink"
                    >
                      +
                    </button>
                  </form>
                </div>
                <div className="w-[110px] self-center text-right">
                  <p className="type-data !text-base">
                    {formatMoney(item.product.priceCents * item.qty)}
                  </p>
                  <form action={removeFromCartAction}>
                    <input type="hidden" name="productId" value={item.productId} />
                    <button
                      type="submit"
                      className="cursor-pointer border-none bg-transparent p-0 text-[13px] text-link hover:underline"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
          <p className="px-5 py-3.5 text-[13px] text-ink-secondary">
            Items in the cart aren’t reserved. Stock is confirmed when you pay.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-1 border border-line bg-surface p-6">
          <div className="flex justify-between text-[15px]">
            <span>Subtotal</span>
            <span className="type-data !text-[15px]">{formatMoney(totals.subtotalCents)}</span>
          </div>
          <div className="flex justify-between text-[15px]">
            <span>Shipping</span>
            <span className="type-data !text-[15px] text-stock-in">
              {totals.shippingCents === 0 ? "Free" : formatMoney(totals.shippingCents)}
            </span>
          </div>
          <div className="flex justify-between text-[15px] text-ink-secondary">
            <span>Tax</span>
            <span className="font-mono">at checkout</span>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-[17px] font-semibold">
            <span>Total</span>
            <span className="type-data !text-[17px]">
              {formatMoney(totals.subtotalCents + totals.shippingCents)}
            </span>
          </div>
          <Button full className="mt-2 py-3.5 text-base" asChildHref="/checkout">
            Continue to checkout
          </Button>
          <p className="text-center text-[13px] text-ink-secondary">
            You’ll sign in or create an account at checkout — it takes one step.
          </p>
          <p className="border-t border-line pt-3 text-center text-[13px] text-ink-secondary">
            Free shipping over $99. We ship within the United States only.
          </p>
        </div>
      </div>
    </main>
  );
}
