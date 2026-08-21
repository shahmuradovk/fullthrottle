// Password-reset token primitives, shared by both auth realms (the realms
// share these pure functions only — tokens live in separate tables).
// The emailed token is random; the database stores only its SHA-256, so a
// database leak never yields a working reset link.

import { createHash, randomBytes } from "node:crypto";

export const CUSTOMER_RESET_TTL_MINUTES = 60;
export const ADMIN_RESET_TTL_MINUTES = 30;

export function newResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function resetTokenExpiry(ttlMinutes: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + ttlMinutes * 60_000);
}
