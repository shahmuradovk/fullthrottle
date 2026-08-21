// Real product photos, fetched by URL server-side (the admin or the AI
// assistant supplies a direct image link), validated by magic bytes and size,
// stored in the database and served from /api/images/[id]. That keeps the CSP
// at img-src 'self' and survives the source URL going dead later.

import { prisma } from "@/lib/db";

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // Netlify function responses cap out near 6MB
const FETCH_TIMEOUT_MS = 15_000;

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

// Content type comes from the bytes themselves, never from the remote server's
// Content-Type header — CDNs mislabel, and we re-serve whatever we store.
export function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes.length < 16) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && ascii(bytes, 1, 3) === "PNG") return "image/png";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp";
  if (ascii(bytes, 4, 4) === "ftyp" && ["avif", "avis"].includes(ascii(bytes, 8, 4))) {
    return "image/avif";
  }
  return null;
}

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /\.(localhost|local|internal)$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^\[?::1\]?$/,
  /^\[?f[cd][0-9a-f]{2}:/i, // fc00::/7 unique-local
];

export function checkImageUrl(raw: string): { ok: true; url: URL } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: `"${raw}" is not a valid URL.` };
  }
  if (url.protocol !== "https:") {
    return { ok: false, error: "Image URLs must be https://." };
  }
  if (PRIVATE_HOST_PATTERNS.some((p) => p.test(url.hostname))) {
    return { ok: false, error: "That host is not reachable from here." };
  }
  return { ok: true, url };
}

export type FetchedImage =
  | { ok: true; bytes: Buffer; contentType: string }
  | { ok: false; error: string };

export async function fetchImage(
  rawUrl: string,
  opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<FetchedImage> {
  const checked = checkImageUrl(rawUrl);
  if (!checked.ok) return checked;
  const doFetch = opts.fetchImpl ?? fetch;

  let response: Response;
  try {
    response = await doFetch(checked.url.toString(), {
      signal: AbortSignal.timeout(opts.timeoutMs ?? FETCH_TIMEOUT_MS),
      headers: {
        // Some image CDNs refuse requests without a browser-looking UA.
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
      },
    });
  } catch {
    return { ok: false, error: `Could not reach ${checked.url.hostname} (network error or timeout).` };
  }
  if (!response.ok) {
    return { ok: false, error: `${checked.url.hostname} answered ${response.status} — the URL may be wrong or blocked.` };
  }

  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) {
    return { ok: false, error: `Image is ${Math.round(declared / 1024)} KB — the limit is ${MAX_IMAGE_BYTES / 1024} KB.` };
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(await response.arrayBuffer());
  } catch {
    return { ok: false, error: "Download was interrupted — try again or use another URL." };
  }
  if (bytes.length > MAX_IMAGE_BYTES) {
    return { ok: false, error: `Image is ${Math.round(bytes.length / 1024)} KB — the limit is ${MAX_IMAGE_BYTES / 1024} KB.` };
  }
  const contentType = sniffImageType(bytes);
  if (!contentType) {
    return {
      ok: false,
      error: "That URL did not return a JPEG/PNG/WebP/AVIF image (it may be an HTML page — use a direct image link, e.g. right-click the photo → Copy image address).",
    };
  }
  return { ok: true, bytes, contentType };
}

// Single-image model for now: replaces whatever the product had. New row =
// new /api/images URL, which is why that route can cache immutably.
export async function storeProductImage(input: {
  productId: string;
  bytes: Buffer;
  contentType: string;
  alt: string;
  sourceUrl: string;
}): Promise<{ id: string; url: string }> {
  const { productId, bytes, contentType, alt, sourceUrl } = input;
  await prisma.productImage.deleteMany({ where: { productId } });
  const image = await prisma.productImage.create({
    data: { productId, url: "", alt, position: 0, data: new Uint8Array(bytes), contentType, sourceUrl },
  });
  const url = `/api/images/${image.id}`;
  await prisma.productImage.update({ where: { id: image.id }, data: { url } });
  return { id: image.id, url };
}
