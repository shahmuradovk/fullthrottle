import { describe, it, expect } from "vitest";
import {
  sniffImageType,
  checkImageUrl,
  fetchImage,
  MAX_IMAGE_BYTES,
} from "../lib/product-images";

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const PNG = Buffer.concat([Buffer.from("\x89PNG\r\n\x1a\n", "binary"), Buffer.alloc(32)]);
const WEBP = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.from([0x24, 0x00, 0x00, 0x00]),
  Buffer.from("WEBPVP8 "),
  Buffer.alloc(32),
]);
const AVIF = Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x20]),
  Buffer.from("ftypavif"),
  Buffer.alloc(32),
]);

describe("sniffImageType", () => {
  it("recognises JPEG, PNG, WebP and AVIF by magic bytes", () => {
    expect(sniffImageType(JPEG)).toBe("image/jpeg");
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(WEBP)).toBe("image/webp");
    expect(sniffImageType(AVIF)).toBe("image/avif");
  });

  it("rejects non-image bytes", () => {
    expect(sniffImageType(Buffer.from("<!doctype html><html>…</html>"))).toBeNull();
    expect(sniffImageType(Buffer.from("<svg xmlns='…'></svg>  padding"))).toBeNull();
    expect(sniffImageType(Buffer.alloc(4))).toBeNull();
  });
});

describe("checkImageUrl", () => {
  it("accepts normal https URLs", () => {
    expect(checkImageUrl("https://cdn.example.com/helmets/k1s.jpg").ok).toBe(true);
  });

  it("rejects non-https and malformed URLs", () => {
    for (const url of ["http://cdn.example.com/x.jpg", "ftp://example.com/x.jpg", "not a url", "data:image/png;base64,AAAA"]) {
      expect(checkImageUrl(url).ok, url).toBe(false);
    }
  });

  it("rejects private and loopback hosts", () => {
    for (const url of [
      "https://localhost/x.jpg",
      "https://127.0.0.1/x.jpg",
      "https://10.0.0.5/x.jpg",
      "https://192.168.1.10/x.jpg",
      "https://172.20.0.3/x.jpg",
      "https://169.254.169.254/latest/meta-data",
      "https://db.internal/x.jpg",
      "https://[::1]/x.jpg",
    ]) {
      expect(checkImageUrl(url).ok, url).toBe(false);
    }
  });
});

describe("fetchImage", () => {
  const respond = (body: BodyInit, init?: ResponseInit) =>
    (async () => new Response(body, init)) as unknown as typeof fetch;

  it("downloads and sniffs a real image", async () => {
    const out = await fetchImage("https://cdn.example.com/k1s.png", { fetchImpl: respond(PNG) });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.contentType).toBe("image/png");
      expect(out.bytes.equals(PNG)).toBe(true);
    }
  });

  it("trusts magic bytes over a lying Content-Type header", async () => {
    const out = await fetchImage("https://cdn.example.com/k1s", {
      fetchImpl: respond(JPEG, { headers: { "content-type": "application/octet-stream" } }),
    });
    expect(out.ok && out.contentType).toBe("image/jpeg");
  });

  it("reports HTTP failures with the status", async () => {
    const out = await fetchImage("https://cdn.example.com/gone.jpg", {
      fetchImpl: respond("nope", { status: 404 }),
    });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toContain("404");
  });

  it("rejects HTML pages posing as images", async () => {
    const out = await fetchImage("https://example.com/product-page", {
      fetchImpl: respond("<!doctype html><html><body>Buy now</body></html>", {
        headers: { "content-type": "image/jpeg" },
      }),
    });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toContain("direct image link");
  });

  it("enforces the size cap on the actual payload", async () => {
    const huge = Buffer.concat([JPEG, Buffer.alloc(MAX_IMAGE_BYTES)]);
    const out = await fetchImage("https://cdn.example.com/huge.jpg", { fetchImpl: respond(huge) });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toContain("limit");
  });

  it("refuses to fetch private hosts at all", async () => {
    let called = false;
    const spy = (async () => {
      called = true;
      return new Response(PNG);
    }) as unknown as typeof fetch;
    const out = await fetchImage("https://169.254.169.254/x.png", { fetchImpl: spy });
    expect(out.ok).toBe(false);
    expect(called).toBe(false);
  });
});
