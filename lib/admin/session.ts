import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { AdminRole } from "@prisma/client";

// Admin auth is a completely separate realm from customer auth: its own
// table (AdminUser), its own cookie, its own JWT — never shared (guardrail 10).

export const ADMIN_COOKIE = "ft_admin";

// full        — password + TOTP verified, real session
// totp-pending    — password ok, waiting for the 6-digit code
// enroll-pending  — password ok, TOTP not yet set up (first login)
export type AdminStage = "full" | "totp-pending" | "enroll-pending";

export type AdminSession = {
  adminId: string;
  email: string;
  role: AdminRole;
  stage: AdminStage;
};

function secretKey(): Uint8Array {
  const secret =
    process.env.ADMIN_SESSION_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET (or ADMIN_SESSION_SECRET) must be set in production.");
    }
    return new TextEncoder().encode("ft-dev-secret-not-for-production");
  }
  return new TextEncoder().encode(secret);
}

export async function createAdminSession(session: AdminSession): Promise<void> {
  const ttlSeconds = session.stage === "full" ? 60 * 60 * 12 : 60 * 10;
  const jwt = await new SignJWT({
    email: session.email,
    role: session.role,
    stage: session.stage,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.adminId)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secretKey());

  (await cookies()).set(ADMIN_COOKIE, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ttlSeconds,
    path: "/",
  });
}

export async function readAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

// Shared with middleware (edge runtime — jose works there, Prisma does not).
export async function verifyAdminToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    return {
      adminId: payload.sub,
      email: String(payload.email ?? ""),
      role: payload.role as AdminRole,
      stage: (payload.stage as AdminStage) ?? "totp-pending",
    };
  } catch {
    return null;
  }
}

export async function destroyAdminSession(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}
