"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteAddressAction, saveAddressAction } from "./actions";
import { AddressFields, type AddressValue } from "@/components/store/address-fields";
import { Button } from "@/components/ui/button";

export type AddressRow = AddressValue & { id: string; isDefault: boolean };

function AddressForm({
  address,
  onDone,
}: {
  address?: AddressRow;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveAddressAction, null);

  useEffect(() => {
    if (state && "ok" in state) onDone();
  }, [state, onDone]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3.5 rounded-1 border border-line bg-surface p-5"
    >
      {address?.id && <input type="hidden" name="addressId" value={address.id} />}
      <AddressFields idPrefix={address?.id ?? "new"} value={address} />
      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          name="isDefault"
          defaultChecked={address?.isDefault}
          className="accent-(--color-accent)"
        />
        Use as my default shipping address
      </label>
      {state && "error" in state && (
        <p role="alert" className="text-[13px] text-error">
          {state.error}
        </p>
      )}
      <div className="flex gap-2.5">
        <Button type="submit" size="small" disabled={pending}>
          Save address
        </Button>
        <Button type="button" size="small" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function AddressBook({ addresses }: { addresses: AddressRow[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {addresses.length === 0 && !adding && (
        <p className="text-sm text-ink-secondary">
          No saved addresses yet. Checkout will offer to save the one you enter.
        </p>
      )}
      {addresses.map((a) =>
        editing === a.id ? (
          <AddressForm key={a.id} address={a} onDone={() => setEditing(null)} />
        ) : (
          <div
            key={a.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-1 border border-line bg-surface p-5"
          >
            <div className="text-[15px] leading-relaxed text-ink">
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}
              <br />
              {a.city}, {a.state} {a.zip}
              {a.isDefault && (
                <span className="ml-2 rounded-1 border border-stock-in px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.05em] text-stock-in">
                  Default
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setEditing(a.id);
                }}
                className="cursor-pointer border-none bg-transparent p-0 text-sm text-link hover:underline"
              >
                Edit
              </button>
              <form action={deleteAddressAction}>
                <input type="hidden" name="addressId" value={a.id} />
                <button
                  type="submit"
                  className="cursor-pointer border-none bg-transparent p-0 text-sm text-error hover:underline"
                >
                  Delete
                </button>
              </form>
            </div>
          </div>
        )
      )}
      {adding ? (
        <AddressForm onDone={() => setAdding(false)} />
      ) : (
        <div>
          <Button
            size="small"
            variant="secondary"
            onClick={() => {
              setEditing(null);
              setAdding(true);
            }}
          >
            Add address
          </Button>
        </div>
      )}
    </div>
  );
}
