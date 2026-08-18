"use client";

import { useActionState } from "react";
import { verifyTotpAction } from "@/lib/admin/auth-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function VerifyTotpPage() {
  const [state, formAction, pending] = useActionState(verifyTotpAction, null);

  return (
    <form
      action={formAction}
      className="flex w-[400px] max-w-full flex-col gap-4 rounded-1 border border-line bg-surface p-8"
    >
      <div>
        <h1 className="font-display text-[28px] font-bold text-ink">TWO-FACTOR CODE</h1>
        <p className="mt-1 text-[13px] text-ink-secondary">
          Open your authenticator app and enter the current 6-digit code.
        </p>
      </div>
      <Input
        id="code"
        name="code"
        label="Code"
        mono
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        required
      />
      {state?.error && (
        <p role="alert" className="text-[13px] text-error">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} full>
        {pending ? "Checking…" : "Verify"}
      </Button>
    </form>
  );
}
