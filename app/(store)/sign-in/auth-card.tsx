"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, signInAction, oauthSignInAction } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AuthCard({
  mode,
  callbackUrl,
  providers,
}: {
  mode: "register" | "signin";
  callbackUrl: string;
  providers: { google: boolean; apple: boolean };
}) {
  const action = mode === "register" ? registerAction : signInAction;
  const [state, formAction, pending] = useActionState(action, null);
  const switchHref = `/sign-in?mode=${mode === "register" ? "signin" : "register"}&callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <div className="flex w-[440px] max-w-full flex-col gap-4 rounded-1 border border-line bg-surface p-8">
      <div>
        <h1 className="font-display text-[32px] font-bold text-ink">
          {mode === "register" ? "CREATE YOUR ACCOUNT" : "SIGN IN"}
        </h1>
        <p className="mt-1.5 text-sm text-ink-secondary">
          An account is required to pay, track your order, and handle returns. Your
          cart carries over.
        </p>
      </div>

      {(providers.google || providers.apple) && (
        <>
          {providers.google && (
            <form action={oauthSignInAction}>
              <input type="hidden" name="provider" value="google" />
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <Button type="submit" variant="secondary" full>
                <span aria-hidden className="font-mono text-[13px]">
                  G
                </span>
                Continue with Google
              </Button>
            </form>
          )}
          {providers.apple && (
            <form action={oauthSignInAction}>
              <input type="hidden" name="provider" value="apple" />
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <Button type="submit" variant="secondary" full>
                <span aria-hidden className="font-mono text-[13px]">

                </span>
                Continue with Apple
              </Button>
            </form>
          )}
          <div className="flex items-center gap-3 text-ink-secondary">
            <span aria-hidden className="h-px flex-1 bg-line" />
            <span className="type-label">or email</span>
            <span aria-hidden className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          autoComplete="username"
          required
        />
        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          hint={mode === "register" ? "Use at least 8 characters." : undefined}
          required
        />
        {state?.error && (
          <p role="alert" className="text-[13px] text-error">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending} full className="py-3 text-base">
          {pending ? "One moment…" : mode === "register" ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-ink">
        {mode === "register" ? (
          <>
            Already have one? <Link href={switchHref}>Sign in</Link>
          </>
        ) : (
          <>
            New here? <Link href={switchHref}>Create an account</Link>
          </>
        )}
      </p>
    </div>
  );
}
