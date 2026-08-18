import { headers } from "next/headers";
import { prisma } from "@/lib/db";

// Postgres-backed fixed-window rate limiter (engineering brief §1). Applied
// to sign-in, sign-up, admin sign-in and checkout submission — card-testing
// attacks target checkout endpoints specifically (§10): over-limit requests
// are blocked, not just logged.

export class RateLimitError extends Error {
  constructor() {
    super("Too many attempts. Wait a minute and try again.");
  }
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "unknown").split(",")[0].trim() || "unknown";
}

export async function rateLimit(params: {
  key: string; // e.g. `signin:${ip}`
  max: number; // attempts per window
  windowSeconds: number;
}): Promise<void> {
  const windowMs = params.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  const bucket = await prisma.rateLimitBucket.upsert({
    where: { key_windowStart: { key: params.key, windowStart } },
    create: { key: params.key, windowStart, count: 1 },
    update: { count: { increment: 1 } },
  });

  // Opportunistic cleanup of expired windows for this key.
  prisma.rateLimitBucket
    .deleteMany({ where: { key: params.key, windowStart: { lt: windowStart } } })
    .catch(() => {});

  if (bucket.count > params.max) throw new RateLimitError();
}
