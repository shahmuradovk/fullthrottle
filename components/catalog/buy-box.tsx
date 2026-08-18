"use client";

import { useActionState, useEffect, useState } from "react";
import { addToCartStateAction, type CartActionResult } from "@/app/(store)/cart/actions";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";

export function BuyBox({
  productId,
  productName,
  inStock,
  maxQty,
}: {
  productId: string;
  productName: string;
  inStock: boolean;
  maxQty: number;
}) {
  const [qty, setQty] = useState(1);
  const [result, formAction, pending] = useActionState<CartActionResult | null, FormData>(
    addToCartStateAction,
    null
  );
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (result?.ok) {
      setToastVisible(true);
      const t = setTimeout(() => setToastVisible(false), 3200);
      return () => clearTimeout(t);
    }
  }, [result]);

  if (!inStock) {
    return (
      <div className="mt-5">
        <Button disabled full>
          Out of stock
        </Button>
        <p className="mt-2.5 text-[13px] text-ink-secondary">
          Check back — restocks land without notice for now.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-5">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="qty" value={qty} />
      <div className="flex gap-3">
        <div className="flex items-center rounded-1 border border-line bg-surface">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="h-12 w-[42px] cursor-pointer border-none bg-transparent text-lg text-ink"
          >
            −
          </button>
          <span aria-live="polite" className="w-9 text-center font-mono text-[15px]">
            {qty}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            className="h-12 w-[42px] cursor-pointer border-none bg-transparent text-lg text-ink"
          >
            +
          </button>
        </div>
        <Button type="submit" disabled={pending} className="h-12 flex-1 text-base">
          {pending ? "Adding…" : "Add to cart"}
        </Button>
      </div>
      {result && !result.ok && (
        <p role="alert" className="mt-2.5 text-[13px] text-error">
          {result.error}
        </p>
      )}
      {toastVisible && (
        <div className="fixed bottom-5 left-1/2 z-50 w-[min(420px,calc(100vw-40px))] -translate-x-1/2">
          <Toast
            message={`Added to cart — ${productName}`}
            action={{ label: "View cart", href: "/cart" }}
          />
        </div>
      )}
    </form>
  );
}
