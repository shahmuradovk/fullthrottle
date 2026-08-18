import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/customer";
import { readCart } from "@/lib/cart";
import { computeTotals } from "@/lib/pricing";
import { paypalConfigured } from "@/lib/payments/paypal";
import { CheckoutFlow } from "./checkout-flow";

export const dynamic = "force-dynamic";

// The account wall lives exactly here: guests browse and cart freely,
// payment requires an account (guardrail 3).
export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const cart = await readCart();
  if (!cart || cart.items.length === 0) redirect("/cart");

  const defaultAddress = await prisma.address.findFirst({
    where: { userId: user.id },
    orderBy: { isDefault: "desc" },
  });

  const items = cart.items.map((i) => ({
    name: `${i.product.brand.name} ${i.product.name}`,
    qty: i.qty,
    lineCents: i.product.priceCents * i.qty,
  }));
  const totals = computeTotals(
    cart.items.map((i) => ({ unitPriceCents: i.product.priceCents, qty: i.qty })),
    0
  );

  return (
    <main className="mx-auto max-w-[1200px] px-5 py-10 md:px-10">
      <CheckoutFlow
        items={items}
        subtotalCents={totals.subtotalCents}
        shippingCents={totals.shippingCents}
        defaultAddress={
          defaultAddress
            ? {
                line1: defaultAddress.line1,
                line2: defaultAddress.line2 ?? "",
                city: defaultAddress.city,
                state: defaultAddress.state,
                zip: defaultAddress.zip,
                phone: defaultAddress.phone ?? "",
              }
            : null
        }
        paypalAvailable={paypalConfigured()}
      />
    </main>
  );
}
