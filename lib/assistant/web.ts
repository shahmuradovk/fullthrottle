// Web reach for the assistant, so it can find real product photos itself:
// fetch_page pulls a public product page and lifts its og:image / prominent
// image URLs (product pages nearly always carry the official photo in
// og:image). Runs server-side under the same https/private-host policy as
// image downloads; nothing from the page is executed, only text-scanned.
// Live search is the web_search tool (OpenRouter's web plugin — no extra
// accounts), in lib/assistant/openrouter.ts.

import { checkImageUrl } from "@/lib/product-images";

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
