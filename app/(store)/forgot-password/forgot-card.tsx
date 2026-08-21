"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction } from "../sign-in/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ForgotPasswordCard() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, null);
  const done = state !== null && "done" in state;

  return (
    <div className="flex w-[440px] max-w-full flex-col gap-4 rounded-1 border border-line bg-surface p-8">
      <div>
        <h1 className="font-display text-[32px] font-bold text-ink">RESET PASSWORD</h1>
        <p className="mt-1.5 text-sm text-ink-secondary">
          Enter your account email and we&rsquo;ll send a reset link. It works once
          and expires in an hour.
        </p>
      </div>

      {done ? (
        <p className="rounded-1 border border-line bg-bg p-3.5 text-sm leading-relaxed text-ink">
          If that email has an account, a reset link is on its way. Check your
          inbox (and spam) — then come back and{" "}
          <Link href="/sign-in?mode=signin" className="underline underline-offset-[3px]">
            sign in
          </Link>{" "}
          with the new password.
        </p>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <Input
            id="email"
            name="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            autoComplete="username"
            required
          />
          {state?.error && (
            <p role="alert" className="text-[13px] text-error">
              {state.error}
            </p>
          )}
          <Button type="submit" disabled={pending} full className="py-3 text-base">
            {pending ? "One moment…" : "Send reset link"}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-ink">
        Remembered it?{" "}
        <Link href="/sign-in?mode=signin" className="underline underline-offset-[3px]">
          Sign in
        </Link>
      </p>
    </div>
  );
}
