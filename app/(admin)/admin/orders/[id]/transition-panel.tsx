"use client";

import { useActionState } from "react";
import { advanceOrderAction } from "./actions";
import { Button } from "@/components/ui/button";

const NEXT_LABEL: Record<string, string> = {
  PREPARING: "Mark as Preparing",
  PACKED: "Mark as Packed",
  SHIPPED: "Mark as Shipped — email the customer",
  DELIVERED: "Mark as Delivered — email the customer",
};

export function TransitionPanel({
  orderId,
  next,
  canCancel,
}: {
  orderId: string;
  next: string | null;
  canCancel: boolean;
}) {
  const [state, formAction, pending] = useActionState(advanceOrderAction, null);
  const [cancelState, cancelAction, cancelPending] = useActionState(
    advanceOrderAction,
    null
  );

  if (!next && !canCancel) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      {next === "SHIPPED" && (
        <form action={formAction} className="flex flex-col gap-2" id={`ship-${orderId}`}>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="next" value="SHIPPED" />
          <label htmlFor="carrier-select" className="type-label text-ink">
            Carrier + tracking number
          </label>
          <div className="flex gap-2">
            <select
              id="carrier-select"
              name="carrier"
              className="w-[110px] rounded-1 border border-line bg-surface px-2.5 py-2 text-sm text-ink"
            >
              <option>UPS</option>
              <option>FedEx</option>
              <option>USPS</option>
            </select>
            <input
              name="trackingNumber"
              placeholder="Tracking number"
              aria-label="Tracking number"
              className="flex-1 rounded-1 border border-line bg-surface px-2.5 py-2 font-mono text-[13px] text-ink placeholder:text-ink-secondary"
            />
          </div>
          {state?.error && (
            <p role="alert" className="text-xs text-error">
              {state.error}
            </p>
          )}
          <Button type="submit" disabled={pending} full size="small">
            {pending ? "Working…" : NEXT_LABEL.SHIPPED}
          </Button>
        </form>
      )}

      {next && next !== "SHIPPED" && (
        <form action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="next" value={next} />
          {state?.error && (
            <p role="alert" className="text-xs text-error">
              {state.error}
            </p>
          )}
          <Button type="submit" disabled={pending} full size="small">
            {pending ? "Working…" : (NEXT_LABEL[next] ?? `Mark as ${next}`)}
          </Button>
        </form>
      )}

      {canCancel && (
        <form action={cancelAction} className="flex flex-col items-start gap-2">
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="next" value="CANCELLED" />
          {cancelState?.error && (
            <p role="alert" className="text-xs text-error">
              {cancelState.error}
            </p>
          )}
          <button
            type="submit"
            disabled={cancelPending}
            className="cursor-pointer border-none bg-transparent p-0 text-[13px] text-error hover:underline"
          >
            Cancel order — email the customer
          </button>
        </form>
      )}
    </div>
  );
}
