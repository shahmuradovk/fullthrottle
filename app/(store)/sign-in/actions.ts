"use server";

import { appUrl } from "@/lib/app-url";
import { randomBytes } from "node:crypto";
import { AuthError } from "next-auth";
import { z } from "zod";
import { hash as argonHash } from "@node-rs/argon2";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { signIn } from "@/auth";
import { clientIp, rateLimit, RateLimitError } from "@/lib/rate-limit";
import {
  CUSTOMER_RESET_TTL_MINUTES,
  hashResetToken,
  newResetToken,
  resetTokenExpiry,
} from "@/lib/reset-token";

async function limited(action: string, max: number): Promise<string | null> {
  try {
    await rateLimit({ key: `${action}:${await clientIp()}`, max, windowSeconds: 600 });
    return null;
  } catch (e) {
    if (e instanceof RateLimitError) return e.message;
    throw e;
  }
}

export type AuthFormState = { error: string } | null;

function safeCallback(raw: unknown): string {
  // Only relative paths — never an open redirect.
  if (typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/account";
}

const registerSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
});

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const limitError = await limited("register", 10);
  if (limitError) return { error: limitError };

  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const email = parsed.data.email.toLowerCase();
  const callbackUrl = safeCallback(formData.get("callbackUrl"));

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "That email already has an account. Sign in instead." };
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: email.split("@")[0],
      passwordHash: await argonHash(parsed.data.password),
    },
  });

  // Email verification: required before order emails are sent (brief §5).
  const token = randomBytes(32).toString("base64url");
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });
  await sendEmail({
    to: email,
    subject: "Confirm your email — Fullthrottle",
    text: `Hi ${user.name},\n\nConfirm your email so order updates reach you:\n${appUrl()}/verify-email?token=${token}\n\nThe link works for 24 hours. If you didn't create this account, ignore this email.`,
  });

  await signIn("credentials", {
    email,
    password: parsed.data.password,
    redirectTo: callbackUrl,
  });
  return null;
}

const signInSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const limitError = await limited("signin", 15);
  if (limitError) return { error: limitError };

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const email = parsed.data.email.toLowerCase();
  const callbackUrl = safeCallback(formData.get("callbackUrl"));

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "No account with that email. Create one instead." };
  if (!user.passwordHash) {
    return {
      error:
        "This account signs in with Google or Apple. Use that button — or set a password via “Forgot password?”.",
    };
  }

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: callbackUrl,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: "That password didn't match. Try again." };
    }
    throw e; // NEXT_REDIRECT on success
  }
  return null;
}

// ── Password reset ───────────────────────────────────────────────────────────
// Request → emailed single-use link (60 min) → new password. The request form
// always reports success so account emails can't be enumerated. OAuth-only
// accounts may use it too — proving control of the inbox is exactly what
// "set a password from your profile" would have required anyway.

export type ResetFormState = { error: string } | { done: true } | null;

const requestResetSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

export async function requestPasswordResetAction(
  _prev: ResetFormState,
  formData: FormData
): Promise<ResetFormState> {
  const limitError = await limited("pw-reset-request", 5);
  if (limitError) return { error: limitError };

  const parsed = requestResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const email = parsed.data.email.toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const { token, tokenHash } = newResetToken();
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: resetTokenExpiry(CUSTOMER_RESET_TTL_MINUTES),
        },
      }),
    ]);
    await sendEmail({
      to: user.contactEmail ?? user.email,
      subject: "Reset your password — Fullthrottle",
      text: `Hi ${user.name},\n\nSomeone asked to reset the password for this account. If that was you, set a new one here:\n${appUrl()}/reset-password?token=${token}\n\nThe link works once and expires in ${CUSTOMER_RESET_TTL_MINUTES} minutes. If you didn't ask for this, ignore this email — your password is unchanged.`,
    });
  }
  return { done: true };
}

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Use at least 8 characters."),
});

export async function resetPasswordAction(
  _prev: ResetFormState,
  formData: FormData
): Promise<ResetFormState> {
  const limitError = await limited("pw-reset", 10);
  if (limitError) return { error: limitError };

  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(parsed.data.token) },
    include: { user: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "That reset link is invalid or has expired. Request a new one." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await argonHash(parsed.data.password) },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
  ]);
  await sendEmail({
    to: record.user.contactEmail ?? record.user.email,
    subject: "Your password was changed — Fullthrottle",
    text: `Hi ${record.user.name},\n\nYour Fullthrottle password was just changed. If this was you, there's nothing to do. If it wasn't, reset it again immediately:\n${appUrl()}/forgot-password`,
  });
  return { done: true };
}

export async function oauthSignInAction(formData: FormData): Promise<void> {
  const provider = formData.get("provider");
  const callbackUrl = safeCallback(formData.get("callbackUrl"));
  if (provider !== "google" && provider !== "apple") return;
  await signIn(provider, { redirectTo: callbackUrl });
}
