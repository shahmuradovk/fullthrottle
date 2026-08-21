// Product illustrations — original vector art drawn to the design system's
// fiche language, one per seeded product, keyed by slug. Admin-created
// products fall back to the striped placeholder until a real image-upload
// pipeline exists (client photography arrives later per the design brief).

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

// A stored ProductImage (e.g. drawn by the admin assistant) wins over the
// bundled manifest; the manifest covers the seed catalog; everything else
// falls back to the placeholder.
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
