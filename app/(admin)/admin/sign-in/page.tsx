"use client";

import { useActionState } from "react";
import { adminSignInAction } from "@/lib/admin/auth-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminSignInPage() {
  const [state, formAction, pending] = useActionState(adminSignInAction, null);

  return (
    <form
      action={formAction}
      className="flex w-[400px] max-w-full flex-col gap-4 rounded-1 border border-line bg-surface p-8"
    >
      <div>
        <h1 className="font-display text-[28px] font-bold text-ink">ADMIN SIGN IN</h1>
        <p className="mt-1 text-[13px] text-ink-secondary">
          Invite-only. Two-factor code required after the password.
        </p>
      </div>
      <Input id="email" name="email" type="email" label="Email" autoComplete="username" required />
      <Input
        id="password"
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        required
      />
      {state?.error && (
        <p role="alert" className="text-[13px] text-error">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} full>
        {pending ? "Checking…" : "Continue"}
      </Button>
    </form>
  );
}
