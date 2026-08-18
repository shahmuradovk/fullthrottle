"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/customer";
import { sendEmail } from "@/lib/email";
import { signOut } from "@/auth";

export type ProfileState = { error: string } | { ok: string } | null;

export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const user = await requireUser("/account/profile");
  const parsed = z
    .object({
      name: z.string().trim().min(1, "Enter your name."),
      contactEmail: z
        .string()
        .trim()
        .email("Enter a valid email address.")
        .or(z.literal("")),
    })
    .safeParse({
      name: formData.get("name"),
      contactEmail: formData.get("contactEmail") ?? "",
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      contactEmail: parsed.data.contactEmail || null,
    },
  });
  revalidatePath("/account/profile");
  return { ok: "Saved." };
}

export async function setPasswordAction(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const user = await requireUser("/account/profile");
  const parsed = z
    .object({
      current: z.string(),
      password: z.string().min(8, "Use at least 8 characters."),
    })
    .safeParse({
      current: formData.get("current") ?? "",
      password: formData.get("password"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // A social-only account sets its first password freely; an account that
  // already has one must present it.
  if (user.passwordHash) {
    const ok =
      parsed.data.current.length > 0 &&
      (await argonVerify(user.passwordHash, parsed.data.current));
    if (!ok) return { error: "Your current password didn't match." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await argonHash(parsed.data.password) },
  });
  revalidatePath("/account/profile");
  return { ok: "Password set. You can now sign in with email + password too." };
}

export async function resendVerificationAction(): Promise<void> {
  const user = await requireUser("/account/profile");
  if (user.emailVerified) return;
  const token = randomBytes(32).toString("base64url");
  await prisma.verificationToken.create({
    data: {
      identifier: user.email,
      token,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });
  const base = (
    process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
  await sendEmail({
    to: user.email,
    subject: "Confirm your email — Fullthrottle",
    text: `Hi ${user.name},\n\nConfirm your email so order updates reach you:\n${base}/verify-email?token=${token}\n\nThe link works for 24 hours.`,
  });
  revalidatePath("/account/profile");
}

export async function customerSignOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
