"use client";

import { useActionState } from "react";
import { inviteAdminAction } from "./actions";
import { Button } from "@/components/ui/button";

const inputClass =
  "rounded-1 border border-line bg-surface px-2.5 py-2 text-sm text-ink placeholder:text-ink-secondary";

export function InviteAdminForm() {
  const [state, formAction, pending] = useActionState(inviteAdminAction, null);
  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-1 border border-line bg-surface p-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="invite-email" className="type-label text-ink">
          Email
        </label>
        <input
          id="invite-email"
          name="email"
          type="email"
          className={`${inputClass} w-56`}
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="invite-role" className="type-label text-ink">
          Role
        </label>
        <select id="invite-role" name="role" className={inputClass} defaultValue="CONTENT">
          <option value="OWNER">Owner — everything</option>
          <option value="MANAGER">Manager — everything but admin users</option>
          <option value="CONTENT">Content — catalog, no prices</option>
          <option value="ORDERS">Orders — status and tracking only</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="invite-password" className="type-label text-ink">
          Starting password
        </label>
        <input
          id="invite-password"
          name="password"
          type="text"
          autoComplete="off"
          className={`${inputClass} w-52 font-mono`}
          required
        />
      </div>
      <Button type="submit" size="small" disabled={pending}>
        Invite admin
      </Button>
      {state && "error" in state && (
        <p role="alert" className="w-full text-[13px] text-error">
          {state.error}
        </p>
      )}
      {state && "created" in state && (
        <p role="status" className="w-full text-[13px] text-stock-in">
          {state.created} Share the starting password over a secure channel.
        </p>
      )}
    </form>
  );
}
