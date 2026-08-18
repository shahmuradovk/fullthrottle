"use client";

import { useActionState } from "react";
import {
  customerSignOutAction,
  resendVerificationAction,
  setPasswordAction,
  updateProfileAction,
} from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function StateLine({ state }: { state: { error: string } | { ok: string } | null }) {
  if (!state) return null;
  if ("error" in state)
    return (
      <p role="alert" className="text-[13px] text-error">
        {state.error}
      </p>
    );
  return (
    <p role="status" className="text-[13px] text-stock-in">
      {state.ok}
    </p>
  );
}

export function ProfileForms({
  name,
  email,
  contactEmail,
  emailVerified,
  hasPassword,
  provider,
}: {
  name: string;
  email: string;
  contactEmail: string;
  emailVerified: boolean;
  hasPassword: boolean;
  provider: string;
}) {
  const [profileState, profileAction, profilePending] = useActionState(
    updateProfileAction,
    null
  );
  const [pwState, pwAction, pwPending] = useActionState(setPasswordAction, null);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3.5 rounded-1 border border-line bg-surface p-5">
        <p className="type-label border-b-[1.5px] border-ink pb-2 text-ink-secondary">
          Profile
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="type-label text-ink-secondary">Account email</p>
            <p className="mt-1 font-mono text-[13px] text-ink">{email}</p>
          </div>
          {emailVerified ? (
            <span className="rounded-1 border border-stock-in px-2 py-1 font-mono text-[10px] uppercase tracking-[0.05em] text-stock-in">
              Verified
            </span>
          ) : (
            <form action={resendVerificationAction}>
              <Button type="submit" size="small" variant="secondary">
                Resend confirmation link
              </Button>
            </form>
          )}
        </div>
        <p className="text-xs text-ink-secondary">Signed in with {provider}.</p>
        <form action={profileAction} className="flex flex-col gap-3.5">
          <Input id="profile-name" name="name" label="Name" defaultValue={name} />
          <Input
            id="profile-contact"
            name="contactEmail"
            label="Contact email (optional)"
            defaultValue={contactEmail}
            hint="Where order updates go if your account email is an Apple relay address."
          />
          <StateLine state={profileState} />
          <div>
            <Button type="submit" size="small" disabled={profilePending}>
              Save profile
            </Button>
          </div>
        </form>
      </div>

      <form
        action={pwAction}
        className="flex flex-col gap-3.5 rounded-1 border border-line bg-surface p-5"
      >
        <p className="type-label border-b-[1.5px] border-ink pb-2 text-ink-secondary">
          {hasPassword ? "Change password" : "Set a password"}
        </p>
        {!hasPassword && (
          <p className="text-[13px] text-ink-secondary">
            Your account signs in with {provider}. Setting a password adds email +
            password as a second way in.
          </p>
        )}
        {hasPassword && (
          <Input
            id="pw-current"
            name="current"
            type="password"
            label="Current password"
            autoComplete="current-password"
          />
        )}
        <Input
          id="pw-new"
          name="password"
          type="password"
          label="New password"
          autoComplete="new-password"
          hint="Use at least 8 characters."
        />
        <StateLine state={pwState} />
        <div>
          <Button type="submit" size="small" disabled={pwPending}>
            {hasPassword ? "Change password" : "Set password"}
          </Button>
        </div>
      </form>

      <form action={customerSignOutAction}>
        <Button type="submit" variant="secondary" size="small">
          Sign out
        </Button>
      </form>
    </div>
  );
}
