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
        "This account signs in with Google or Apple. Use that button, then set a password from your profile.",
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

export async function oauthSignInAction(formData: FormData): Promise<void> {
  const provider = formData.get("provider");
  const callbackUrl = safeCallback(formData.get("callbackUrl"));
  if (provider !== "google" && provider !== "apple") return;
  await signIn(provider, { redirectTo: callbackUrl });
}
