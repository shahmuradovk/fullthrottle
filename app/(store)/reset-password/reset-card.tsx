"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction } from "../sign-in/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ResetPasswordCard({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, null);
  const done = state !== null && "done" in state;

  return (
    <div className="flex w-[440px] max-w-full flex-col gap-4 rounded-1 border border-line bg-surface p-8">
      <div>
        <h1 className="font-display text-[32px] font-bold text-ink">NEW PASSWORD</h1>
        <p className="mt-1.5 text-sm text-ink-secondary">
          Choose a new password for your account.
        </p>
      </div>

      {done ? (
        <p className="rounded-1 border border-line bg-bg p-3.5 text-sm leading-relaxed text-ink">
          Password changed.{" "}
          <Link href="/sign-in?mode=signin" className="underline underline-offset-[3px]">
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
            hint="Use at least 8 characters."
            required
          />
          {state?.error && (
            <p role="alert" className="text-[13px] text-error">
              {state.error}{" "}
              <Link href="/forgot-password" className="underline underline-offset-[3px]">
                Request a new link
              </Link>
            </p>
          )}
          <Button type="submit" disabled={pending} full className="py-3 text-base">
            {pending ? "One moment…" : "Set new password"}
          </Button>
        </form>
      )}
    </div>
  );
}
