import { describe, it, expect } from "vitest";
import {
  newResetToken,
  hashResetToken,
  resetTokenExpiry,
  CUSTOMER_RESET_TTL_MINUTES,
  ADMIN_RESET_TTL_MINUTES,
} from "../lib/reset-token";

describe("reset tokens", () => {
  it("issues url-safe tokens and stores only their hash", () => {
    const { token, tokenHash } = newResetToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/); // base64url, no padding
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
    expect(tokenHash).not.toContain(token);
    expect(hashResetToken(token)).toBe(tokenHash); // deterministic re-derivation
  });

  it("issues unique tokens", () => {
    const seen = new Set(Array.from({ length: 50 }, () => newResetToken().token));
    expect(seen.size).toBe(50);
  });

  it("computes expiry from the realm TTL", () => {
    const now = new Date("2026-08-21T12:00:00Z");
    expect(resetTokenExpiry(CUSTOMER_RESET_TTL_MINUTES, now).toISOString()).toBe(
      "2026-08-21T13:00:00.000Z"
    );
    expect(resetTokenExpiry(ADMIN_RESET_TTL_MINUTES, now).toISOString()).toBe(
      "2026-08-21T12:30:00.000Z"
    );
  });
});
