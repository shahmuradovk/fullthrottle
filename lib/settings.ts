// Admin-managed configuration (the Integrations screen) — a tiny key/value
// store on top of the Setting table. Secrets are sealed with AES-256-GCM
// under a key derived from the admin session secret, so neither a database
// dump nor an env dump alone is enough to recover them.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

function derivedKey(): Buffer {
  const secret =
    process.env.ADMIN_SESSION_SECRET ?? process.env.AUTH_SECRET ?? "ft-dev-secret-not-for-production";
  return createHash("sha256").update(`ft-settings:${secret}`).digest();
}

export function sealSecret(plain: string, key: Buffer = derivedKey()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    enc.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".");
}

export function openSecret(sealed: string, key: Buffer = derivedKey()): string | null {
  try {
    const [version, iv, enc, tag] = sealed.split(".");
    if (version !== "v1" || !iv || !enc || !tag) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(enc, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null; // tampered, truncated, or sealed under a different secret
  }
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function deleteSetting(key: string): Promise<void> {
  await prisma.setting.deleteMany({ where: { key } });
}
