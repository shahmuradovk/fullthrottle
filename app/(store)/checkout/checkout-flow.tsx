"use client";

import { useActionState, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { prepareCheckoutAction, type PrepareResult } from "./actions";
import { AddressFields, type AddressValue } from "@/components/store/address-fields";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";

type SummaryItem = { name: string; qty: number; lineCents: number };

function Stepper({ step }: { step: 1 | 2 }) {
  const items = [
    { n: 1, label: "Address" },
    { n: 2, label: "Payment" },
    { n: 3, label: "Review" },
  ];
  return (
    <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.06em]">
      {items.map((item, i) => {
        const done = item.n < step;
        const current = item.n === step;
        return (
          <span key={item.n} className="flex items-center gap-2.5">
            {i > 0 && (
              <span
                aria-hidden
                className={cn("h-[1.5px] w-5", done || current ? "bg-ink" : "bg-line")}
              />
            )}
            <span
              className={cn(
                "grid size-5 place-items-center rounded-pill text-[10px]",
                done && "bg-accent text-accent-ink",
                current && "box-border border-2 border-accent text-accent",
                !done && !current && "box-border border-[1.5px] border-line text-ink-secondary"
              )}
            >
              {done ? "✓" : item.n}
            </span>
            <span
              className={cn(
                current ? "text-accent" : done ? "text-ink" : "text-ink-secondary"
              )}
            >
              {item.label}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function Summary({
  items,
  subtotalCents,
  shippingCents,
  taxCents,
  taxIsEstimate,
  totalCents,
  cta,
}: {
  items: SummaryItem[];
  subtotalCents: number;
  shippingCents: number;
  taxCents: number | null;
  taxIsEstimate: boolean;
  totalCents: number | null;
  cta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-1 border border-line bg-surface p-6">
      {items.map((i) => (
        <div key={i.name} className="flex justify-between gap-3 text-sm">
          <span className="text-ink-secondary">
            {i.name} × {i.qty}
          </span>
          <span className="font-mono">{formatMoney(i.lineCents)}</span>
        </div>
      ))}
      <div className="flex justify-between border-t border-line pt-3 text-sm">
        <span>Subtotal</span>
        <span className="font-mono">{formatMoney(subtotalCents)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span>Shipping</span>
        <span className="font-mono text-stock-in">
          {shippingCents === 0 ? "Free" : formatMoney(shippingCents)}
        </span>
      </div>
      <div className="flex justify-between text-sm">
        <span>{taxIsEstimate ? "Estimated sales tax" : "Sales tax"}</span>
        <span className="font-mono">
          {taxCents === null ? "next step" : formatMoney(taxCents)}
        </span>
      </div>
      <div className="flex justify-between border-t border-line pt-3 text-[17px] font-semibold">
        <span>Total</span>
        <span className="font-mono">
          {totalCents === null ? "—" : formatMoney(totalCents)}
        </span>
      </div>
      {cta}
    </div>
  );
}

function StripePaymentStep({
  prepared,
  items,
  subtotalCents,
  shippingCents,
}: {
  prepared: Extract<PrepareResult, { kind: "stripe" }>;
  items: SummaryItem[];
  subtotalCents: number;
  shippingCents: number;
}) {
  const stripePromise = useMemo(
    () => loadStripe(prepared.publishableKey),
    [prepared.publishableKey]
  );
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: prepared.clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#E8622C",
            colorBackground: "#1F242A",
            colorText: "#E8E6E0",
            colorDanger: "#E0705F",
            borderRadius: "2px",
            fontFamily: "Barlow, sans-serif",
          },
        },
      }}
    >
      <StripePaymentInner
        prepared={prepared}
        items={items}
        subtotalCents={subtotalCents}
        shippingCents={shippingCents}
      />
    </Elements>
  );
}

function StripePaymentInner({
  prepared,
  items,
  subtotalCents,
  shippingCents,
}: {
  prepared: Extract<PrepareResult, { kind: "stripe" }>;
  items: SummaryItem[];
  subtotalCents: number;
  shippingCents: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const placeOrder = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setPayError(null);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/confirmation/${prepared.orderId}`,
      },
    });
    if (error) {
      setPayError(
        error.message ??
          "Payment didn't go through. Try another card or PayPal — nothing was charged."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-3.5 rounded-1 border border-line bg-surface p-6">
        <h2 className="font-display text-[22px] font-semibold text-ink">PAYMENT</h2>
        {payError && (
          <div className="flex items-start gap-3 rounded-1 border border-error bg-error-bg px-4 py-3.5">
            <span aria-hidden className="font-mono text-[13px] text-error">
              !
            </span>
            <p className="text-sm text-ink">
              <span className="font-semibold text-error">Payment didn’t go through. </span>
              {payError} Nothing was charged.
            </p>
          </div>
        )}
        {/* Card fields live inside Stripe's iframe — never in our DOM. */}
        <PaymentElement options={{ layout: "tabs" }} />
        <p className="text-xs text-ink-secondary">
          Apple Pay and Google Pay appear automatically on devices that support them.
        </p>
      </div>
      <Summary
        items={items}
        subtotalCents={subtotalCents}
        shippingCents={shippingCents}
        taxCents={prepared.taxCents}
        taxIsEstimate={prepared.taxIsEstimate}
        totalCents={prepared.totalCents}
        cta={
          <>
            <Button
              full
              className="mt-2 py-3.5 text-base"
              disabled={!stripe || submitting}
              onClick={placeOrder}
            >
              {submitting
                ? "Confirming…"
                : `Place order — ${formatMoney(prepared.totalCents)}`}
            </Button>
            <p className="text-center text-xs text-ink-secondary">
              Charged when you place the order. Stock is confirmed at this step.
            </p>
          </>
        }
      />
    </div>
  );
}

export function CheckoutFlow({
  items,
  subtotalCents,
  shippingCents,
  defaultAddress,
  paypalAvailable,
}: {
  items: SummaryItem[];
  subtotalCents: number;
  shippingCents: number;
  defaultAddress: AddressValue | null;
  paypalAvailable: boolean;
}) {
  const [state, formAction, pending] = useActionState(prepareCheckoutAction, null);
  const [method, setMethod] = useState<"CARD" | "PAYPAL">("CARD");

  const prepared = state && "kind" in state ? state : null;
  const step: 1 | 2 = prepared ? 2 : 1;

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-center gap-4">
        <h1 className="font-display text-[40px] font-bold text-ink">CHECKOUT</h1>
        <Stepper step={step} />
      </div>

      {prepared ? (
        <StripePaymentStep
          prepared={prepared}
          items={items}
          subtotalCents={subtotalCents}
          shippingCents={shippingCents}
        />
      ) : (
        <form action={formAction} className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3.5 rounded-1 border border-line bg-surface p-6">
              <h2 className="font-display text-[22px] font-semibold text-ink">
                SHIPPING ADDRESS
              </h2>
              <AddressFields idPrefix="ship" value={defaultAddress ?? undefined} />
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
                <input
                  type="checkbox"
                  name="saveAddress"
                  defaultChecked={!defaultAddress}
                  className="accent-(--color-accent)"
                />
                Save this address to my account
              </label>
              <p className="text-xs text-ink-secondary">
                We ship within the United States only.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 rounded-1 border border-line bg-surface p-6">
              <h2 className="font-display text-[22px] font-semibold text-ink">PAYMENT</h2>
              <input type="hidden" name="method" value={method} />
              {[
                {
                  id: "CARD" as const,
                  label: "Bank card · Apple Pay · Google Pay",
                  note: "Handled by Stripe — card data never touches our servers.",
                  enabled: true,
                },
                {
                  id: "PAYPAL" as const,
                  label: "PayPal",
                  note: paypalAvailable
                    ? "You approve the payment at PayPal and land back here."
                    : "Not configured yet.",
                  enabled: paypalAvailable,
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!opt.enabled}
                  onClick={() => setMethod(opt.id)}
                  aria-pressed={method === opt.id}
                  className={cn(
                    "flex items-center gap-3 rounded-1 border p-4 text-left transition-[border-color] duration-(--dur-fast)",
                    method === opt.id ? "border-[1.5px] border-ink" : "border-line",
                    opt.enabled ? "cursor-pointer hover:border-ink" : "opacity-45"
                  )}
                >
                  <span
                    aria-hidden
                    className="grid size-4 place-items-center rounded-pill border-[1.5px] border-ink"
                  >
                    {method === opt.id && <span className="size-2 rounded-pill bg-ink" />}
                  </span>
                  <span className="flex-1">
                    <span className="block text-[15px] font-semibold text-ink">
                      {opt.label}
                    </span>
                    <span className="block text-xs text-ink-secondary">{opt.note}</span>
                  </span>
                </button>
              ))}
            </div>

            {state && "error" in state && (
              <div className="flex items-start gap-3 rounded-1 border border-error bg-error-bg px-4 py-3.5">
                <span aria-hidden className="font-mono text-[13px] text-error">
                  !
                </span>
                <p role="alert" className="text-sm text-ink">
                  {state.error}
                </p>
              </div>
            )}
          </div>

          <Summary
            items={items}
            subtotalCents={subtotalCents}
            shippingCents={shippingCents}
            taxCents={null}
            taxIsEstimate
            totalCents={null}
            cta={
              <>
                <Button type="submit" full disabled={pending} className="mt-2 py-3.5 text-base">
                  {pending
                    ? "Checking stock…"
                    : method === "PAYPAL"
                      ? "Continue to PayPal"
                      : "Continue to payment"}
                </Button>
                <p className="text-center text-xs text-ink-secondary">
                  Tax is calculated from your address at the next step.
                </p>
              </>
            }
          />
        </form>
      )}
    </div>
  );
}
