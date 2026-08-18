"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { verify as argonVerify } from "@node-rs/argon2";
import { generateSecret, verify as totpVerify } from "otplib";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit, RateLimitError } from "@/lib/rate-limit";
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
