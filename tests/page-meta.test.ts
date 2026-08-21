import { describe, it, expect } from "vitest";
import { extractPageMeta } from "../lib/assistant/web";

describe("extractPageMeta", () => {
  it("prefers og:image and resolves relative URLs against the page", () => {
    const html = `
      <html><head>
        <title> Shoei X-Fifteen Helmet </title>
        <meta property="og:image" content="/cdn/x15-side.jpg" />
        <meta name="twitter:image" content="https://cdn.example.com/x15-front.webp">
      </head><body>
        <img src="https://cdn.example.com/thumb-1.jpg">
      </body></html>`;
    const meta = extractPageMeta(html, "https://shop.example.com/helmets/x15");
    expect(meta.title).toBe("Shoei X-Fifteen Helmet");
    expect(meta.imageCandidates[0]).toBe("https://shop.example.com/cdn/x15-side.jpg");
    expect(meta.imageCandidates).toContain("https://cdn.example.com/x15-front.webp");
    expect(meta.imageCandidates).toContain("https://cdn.example.com/thumb-1.jpg");
  });

  it("drops non-https, dedupes, and caps the list", () => {
    const imgs = Array.from(
      { length: 30 },
      (_, i) => `<img src="https://cdn.example.com/p${i}.png">`
    ).join("");
    const html = `<meta property="og:image" content="http://insecure.example.com/x.jpg">${imgs}${imgs}`;
    const meta = extractPageMeta(html, "https://shop.example.com/");
    expect(meta.imageCandidates.every((u) => u.startsWith("https://"))).toBe(true);
    expect(meta.imageCandidates.length).toBeLessThanOrEqual(12);
    expect(new Set(meta.imageCandidates).size).toBe(meta.imageCandidates.length);
  });

  it("survives pages with no usable images", () => {
    const meta = extractPageMeta("<html><body><p>nothing here</p></body></html>", "https://x.example.com");
    expect(meta.title).toBeNull();
    expect(meta.imageCandidates).toEqual([]);
  });
});
