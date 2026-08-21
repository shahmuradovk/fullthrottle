// Web reach for the assistant, so it can find real product photos itself:
//   fetch_page  — keyless: pull a public product page and lift its og:image /
//                 prominent image URLs (product pages nearly always carry the
//                 official photo in og:image)
//   image search — optional: Google Programmable Search (key + engine id from
//                 the Integrations screen, env vars as fallback)
// Both run server-side under the same https/private-host policy as image
// downloads; nothing from the page is executed, only text-scanned.

import { checkImageUrl } from "@/lib/product-images";
import { getSetting, openSecret } from "@/lib/settings";

const PAGE_TIMEOUT_MS = 15_000;
const MAX_PAGE_CHARS = 2_000_000;
const MAX_CANDIDATES = 12;

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export type PageMeta = { title: string | null; imageCandidates: string[] };

export function extractPageMeta(html: string, baseUrl: string): PageMeta {
  const title = /<title[^>]*>\s*([^<]{1,300})/i.exec(html)?.[1]?.trim() ?? null;

  const candidates: string[] = [];
  const push = (raw?: string | null) => {
    if (!raw || candidates.length >= MAX_CANDIDATES) return;
    let absolute: string;
    try {
      absolute = new URL(raw.trim(), baseUrl).toString();
    } catch {
      return;
    }
    if (!absolute.startsWith("https://")) return;
    if (!candidates.includes(absolute)) candidates.push(absolute);
  };

  // The page's own headline image first — og:image / twitter:image.
  for (const tag of html.matchAll(
    /<meta[^>]+(?:property|name)\s*=\s*["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*>/gi
  )) {
    push(/content\s*=\s*["']([^"']+)["']/i.exec(tag[0])?.[1]);
  }
  for (const tag of html.matchAll(/<link[^>]+rel\s*=\s*["']image_src["'][^>]*>/gi)) {
    push(/href\s*=\s*["']([^"']+)["']/i.exec(tag[0])?.[1]);
  }
  // Then plain <img> photo files as fallback candidates.
  for (const img of html.matchAll(
    /<img[^>]+src\s*=\s*["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["']/gi
  )) {
    push(img[1]);
  }
  return { title, imageCandidates: candidates };
}

export async function fetchPageMeta(
  rawUrl: string
): Promise<({ ok: true } & PageMeta) | { ok: false; error: string }> {
  const checked = checkImageUrl(rawUrl); // same https + private-host policy
  if (!checked.ok) return checked;

  let response: Response;
  try {
    response = await fetch(checked.url.toString(), {
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
      headers: {
        "user-agent": BROWSER_UA,
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
      },
    });
  } catch {
    return { ok: false, error: `Could not reach ${checked.url.hostname} (network error or timeout).` };
  }
  if (!response.ok) {
    return {
      ok: false,
      error: `${checked.url.hostname} answered ${response.status} — the page may not exist; try another URL.`,
    };
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("html")) {
    return {
      ok: false,
      error:
        "That URL is not an HTML page. If it's a direct image URL, pass it straight to set_product_image.",
    };
  }
  let html: string;
  try {
    html = (await response.text()).slice(0, MAX_PAGE_CHARS);
  } catch {
    return { ok: false, error: "Download was interrupted — try again." };
  }
  return { ok: true, ...extractPageMeta(html, response.url || checked.url.toString()) };
}

// ── Google Programmable Search (optional) ────────────────────────────────────

export const CSE_KEY_SETTING = "google_cse.key";
export const CSE_CX_SETTING = "google_cse.cx";

export type ImageSearchConfig = {
  key: string | null;
  cx: string | null;
  source: "panel" | "env" | null;
};

export async function imageSearchConfig(): Promise<ImageSearchConfig> {
  const sealed = await getSetting(CSE_KEY_SETTING);
  const panelKey = sealed ? openSecret(sealed) : null;
  const panelCx = await getSetting(CSE_CX_SETTING);
  if (panelKey && panelCx) return { key: panelKey, cx: panelCx, source: "panel" };
  const envKey = process.env.GOOGLE_CSE_KEY || null;
  const envCx = process.env.GOOGLE_CSE_ID || null;
  if (envKey && envCx) return { key: envKey, cx: envCx, source: "env" };
  return { key: null, cx: null, source: null };
}

export type ImageHit = {
  image_url: string;
  page_url: string | null;
  title: string | null;
  width: number | null;
  height: number | null;
};

export async function searchImages(
  query: string,
  config: { key: string; cx: string }
): Promise<{ ok: true; results: ImageHit[] } | { ok: false; error: string }> {
  const params = new URLSearchParams({
    key: config.key,
    cx: config.cx,
    q: query,
    searchType: "image",
    num: "8",
    safe: "active",
  });
  let response: Response;
  try {
    response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, {
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { ok: false, error: "Couldn't reach Google image search — try again." };
  }
  if (response.status === 429) {
    return { ok: false, error: "Google search quota exhausted for today (free tier is 100/day)." };
  }
  if (!response.ok) {
    let detail = `status ${response.status}`;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body.error?.message) detail = body.error.message;
    } catch {
      // keep status text
    }
    return { ok: false, error: `Google image search failed: ${detail}` };
  }
  const data = (await response.json()) as {
    items?: {
      link?: string;
      title?: string;
      image?: { contextLink?: string; width?: number; height?: number };
    }[];
  };
  const results = (data.items ?? [])
    .filter((item) => typeof item.link === "string" && item.link.startsWith("https://"))
    .map((item) => ({
      image_url: item.link as string,
      page_url: item.image?.contextLink ?? null,
      title: item.title ?? null,
      width: item.image?.width ?? null,
      height: item.image?.height ?? null,
    }));
  return { ok: true, results };
}
