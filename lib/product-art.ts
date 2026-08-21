// Interim vector art for the seeded catalog, keyed by slug. Real product
// photos (stored ProductImage rows, see lib/product-images.ts) always win —
// this manifest only fills the gap until a photo is attached via the admin
// form or the assistant's set_product_image tool.

const PRODUCT_ART = new Set([
  "agv-k6-s",
  "shoei-rf-1400",
  "hjc-rpha-12-carbon",
  "arai-corsair-x",
  "bell-srt-modular",
  "akrapovic-slip-on-line-titanium",
  "yoshimura-alpha-t-street-slip-on",
  "vance-hines-hi-output-grenade-full-system",
  "sc-project-s1-gp-carbon-slip-on",
]);

export function productArt(slug: string): string | null {
  return PRODUCT_ART.has(slug) ? `/products/${slug}.svg` : null;
}

// A stored ProductImage (a real photo attached by the admin or the
// assistant) wins over the bundled manifest; the manifest covers the seed
// catalog; everything else falls back to the placeholder.
export function resolveProductArt(
  slug: string,
  images?: { url: string }[] | null
): string | null {
  return images?.[0]?.url ?? productArt(slug);
}

// Flagship art for the home page section cards.
export const SECTION_ART: Record<string, string> = {
  "moto-exhaust": "/products/akrapovic-slip-on-line-titanium.svg",
  "moto-helmets": "/products/agv-k6-s.svg",
};
