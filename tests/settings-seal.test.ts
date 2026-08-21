import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { sealSecret, openSecret } from "../lib/settings";

const key = createHash("sha256").update("test-secret").digest();
const otherKey = createHash("sha256").update("other-secret").digest();

describe("settings secret sealing", () => {
  it("round-trips a secret", () => {
    const sealed = sealSecret("sk-or-v1-abc123", key);
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(sealed).not.toContain("abc123");
    expect(openSecret(sealed, key)).toBe("sk-or-v1-abc123");
  });

  it("uses a fresh nonce every time", () => {
    expect(sealSecret("same", key)).not.toBe(sealSecret("same", key));
  });

  it("refuses tampered or foreign ciphertext", () => {
    const sealed = sealSecret("secret", key);
    expect(openSecret(sealed, otherKey)).toBeNull(); // different derivation secret
    const [v, iv, enc, tag] = sealed.split(".");
    const flipped = enc[0] === "A" ? "B" + enc.slice(1) : "A" + enc.slice(1);
    expect(openSecret([v, iv, flipped, tag].join("."), key)).toBeNull();
    expect(openSecret("not-a-sealed-value", key)).toBeNull();
  });
});
