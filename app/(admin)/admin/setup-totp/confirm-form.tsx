"use client";

import { useActionState } from "react";
import { verifyTotpAction } from "@/lib/admin/auth-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ConfirmTotpForm() {
  const [state, formAction, pending] = useActionState(verifyTotpAction, null);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input
        id="code"
        name="code"
        label="Code from the app"
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
        {pending ? "Checking…" : "Turn on two-factor and sign in"}
      </Button>
    </form>
  );
}
