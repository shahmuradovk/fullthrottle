"use client";

import Link from "next/link";
import { useActionState } from "react";
import { adminResetPasswordAction } from "@/lib/admin/auth-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AdminResetPasswordCard({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(adminResetPasswordAction, null);
  const done = state !== null && "done" in state;

  return (
    <div className="flex w-[400px] max-w-full flex-col gap-4 rounded-1 border border-line bg-surface p-8">
      <div>
        <h1 className="font-display text-[28px] font-bold text-ink">NEW ADMIN PASSWORD</h1>
        <p className="mt-1 text-[13px] text-ink-secondary">
          Two-factor stays on — you&rsquo;ll still need your authenticator code.
        </p>
      </div>

      {done ? (
        <p className="rounded-1 border border-line bg-bg p-3.5 text-sm leading-relaxed text-ink">
          Password changed.{" "}
          <Link href="/admin/sign-in" className="underline underline-offset-[3px]">
            Sign in
          </Link>{" "}
          with the new one.
        </p>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />
          <Input
            id="password"
            name="password"
            type="password"
            label="New password"
            autoComplete="new-password"
            hint="At least 12 characters."
            required
          />
          {state?.error && (
            <p role="alert" className="text-[13px] text-error">
              {state.error}{" "}
              <Link href="/admin/forgot-password" className="underline underline-offset-[3px]">
                Request a new link
              </Link>
            </p>
          )}
          <Button type="submit" disabled={pending} full>
            {pending ? "One moment…" : "Set new password"}
          </Button>
        </form>
      )}
    </div>
  );
}
