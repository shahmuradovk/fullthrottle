"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";
import { generateSecret, verify as totpVerify } from "otplib";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit, RateLimitError } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/app-url";
import { writeAudit } from "@/lib/audit";
import {
  ADMIN_RESET_TTL_MINUTES,
  hashResetToken,
  newResetToken,
  resetTokenExpiry,
} from "@/lib/reset-token";
import {
  createAdminSession,
  destroyAdminSession,
  readAdminSession,
} from "./session";

export type AuthFormState = { error: string } | null;

const credentialsSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

const GENERIC_ERROR = "Email or password is wrong.";

export async function adminSignInAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  try {
    await rateLimit({
      key: `admin-signin:${await clientIp()}`,
      max: 8,
      windowSeconds: 600,
    });
  } catch (e) {
    if (e instanceof RateLimitError) return { error: e.message };
    throw e;
  }

  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  }

  const admin = await prisma.adminUser.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (!admin) return { error: GENERIC_ERROR };

  const ok = await argonVerify(admin.passwordHash, parsed.data.password);
  if (!ok) return { error: GENERIC_ERROR };

  if (admin.totpEnabled && admin.totpSecret) {
    await createAdminSession({
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      stage: "totp-pending",
    });
    redirect("/admin/verify-totp");
  }

  // First login: MFA is mandatory — enrollment before anything else.
  await createAdminSession({
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
    stage: "enroll-pending",
  });
  redirect("/admin/setup-totp");
}

const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."),
});

export async function verifyTotpAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const session = await readAdminSession();
  if (!session) redirect("/admin/sign-in");

  const parsed = codeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter the 6-digit code." };
  }

  const admin = await prisma.adminUser.findUnique({ where: { id: session.adminId } });
  if (!admin?.totpSecret) redirect("/admin/sign-in");

  const result = await totpVerify({ token: parsed.data.code, secret: admin.totpSecret });
  if (!result.valid) {
    return { error: "That code didn't match. Codes rotate every 30 seconds — try the current one." };
  }

  if (!admin.totpEnabled) {
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { totpEnabled: true },
    });
  }
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });
  await createAdminSession({
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
    stage: "full",
  });
  redirect("/admin");
}

// Called by the setup page (server component) to make sure a secret exists
// before rendering the QR code.
export async function ensureTotpSecret(adminId: string): Promise<string> {
  const admin = await prisma.adminUser.findUniqueOrThrow({ where: { id: adminId } });
  if (admin.totpSecret && !admin.totpEnabled) return admin.totpSecret;
  if (admin.totpSecret) return admin.totpSecret;
  const secret = generateSecret();
  await prisma.adminUser.update({ where: { id: adminId }, data: { totpSecret: secret } });
  return secret;
}

export async function adminSignOutAction(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/sign-in");
}

// ── Password reset (admin realm) ─────────────────────────────────────────────
// Same shape as the storefront flow but a separate token table, a shorter
// window and a longer minimum password. Resetting the password never touches
// TOTP — sign-in still demands the authenticator code.

export type AdminResetFormState = { error: string } | { done: true } | null;

export async function adminRequestPasswordResetAction(
  _prev: AdminResetFormState,
  formData: FormData
): Promise<AdminResetFormState> {
  try {
    await rateLimit({
      key: `admin-pw-reset-request:${await clientIp()}`,
      max: 5,
      windowSeconds: 900,
    });
  } catch (e) {
    if (e instanceof RateLimitError) return { error: e.message };
    throw e;
  }

  const parsed = z
    .object({ email: z.string().email("Enter a valid email address.") })
    .safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const email = parsed.data.email.toLowerCase();

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (admin) {
    const { token, tokenHash } = newResetToken();
    await prisma.$transaction([
      prisma.adminPasswordResetToken.deleteMany({ where: { adminId: admin.id } }),
      prisma.adminPasswordResetToken.create({
        data: {
          adminId: admin.id,
          tokenHash,
          expiresAt: resetTokenExpiry(ADMIN_RESET_TTL_MINUTES),
        },
      }),
    ]);
    await sendEmail({
      to: admin.email,
      subject: "Admin password reset — Fullthrottle",
      text: `Someone asked to reset the Fullthrottle ADMIN password for this address. If that was you, set a new one here:\n${appUrl()}/admin/reset-password?token=${token}\n\nThe link works once and expires in ${ADMIN_RESET_TTL_MINUTES} minutes. Your authenticator (two-factor) code is still required to sign in afterwards.\n\nIf you didn't ask for this, ignore this email and tell the store owner.`,
    });
  }
  return { done: true };
}

export async function adminResetPasswordAction(
  _prev: AdminResetFormState,
  formData: FormData
): Promise<AdminResetFormState> {
  try {
    await rateLimit({
      key: `admin-pw-reset:${await clientIp()}`,
      max: 10,
      windowSeconds: 900,
    });
  } catch (e) {
    if (e instanceof RateLimitError) return { error: e.message };
    throw e;
  }

  const parsed = z
    .object({
      token: z.string().min(1),
      password: z.string().min(12, "Admin passwords need at least 12 characters."),
    })
    .safeParse({ token: formData.get("token"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const record = await prisma.adminPasswordResetToken.findUnique({
    where: { tokenHash: hashResetToken(parsed.data.token) },
    include: { admin: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "That reset link is invalid or has expired. Request a new one." };
  }

  await prisma.$transaction([
    prisma.adminUser.update({
      where: { id: record.adminId },
      data: { passwordHash: await argonHash(parsed.data.password) },
    }),
    prisma.adminPasswordResetToken.deleteMany({ where: { adminId: record.adminId } }),
  ]);
  await writeAudit({
    actorId: record.adminId,
    action: "admin.password.reset",
    entity: "AdminUser",
    entityId: record.adminId,
    after: { via: "email-link" },
  });
  await sendEmail({
    to: record.admin.email,
    subject: "Your admin password was changed — Fullthrottle",
    text: `The Fullthrottle admin password for ${record.admin.email} was just changed via a reset link. If this wasn't you, reset it again immediately and tell the store owner:\n${appUrl()}/admin/forgot-password`,
  });
  return { done: true };
}
