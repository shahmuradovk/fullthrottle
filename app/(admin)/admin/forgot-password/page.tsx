"use client";

import Link from "next/link";
import { useActionState } from "react";
import { adminRequestPasswordResetAction } from "@/lib/admin/auth-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(adminRequestPasswordResetAction, null);
  const done = state !== null && "done" in state;

  return (
    <div className="flex w-[400px] max-w-full flex-col gap-4 rounded-1 border border-line bg-surface p-8">
      <div>
        <h1 className="font-display text-[28px] font-bold text-ink">RESET PASSWORD</h1>
        <p className="mt-1 text-[13px] text-ink-secondary">
          We&rsquo;ll email a single-use link (30 minutes). Your authenticator code
          is still required to sign in afterwards.
        </p>
      </div>

      {done ? (
        <p className="rounded-1 border border-line bg-bg p-3.5 text-sm leading-relaxed text-ink">
          If that email belongs to an admin account, a reset link is on its way.
        </p>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <Input id="email" name="email" type="email" label="Email" autoComplete="username" required />
          {state?.error && (
            <p role="alert" className="text-[13px] text-error">
              {state.error}
            </p>
          )}
          <Button type="submit" disabled={pending} full>
            {pending ? "One moment…" : "Send reset link"}
          </Button>
        </form>
      )}

      <p className="text-center text-[13px] text-ink">
        <Link href="/admin/sign-in" className="underline underline-offset-[3px]">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
