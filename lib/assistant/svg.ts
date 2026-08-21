// The assistant may draw product illustrations as SVG. Before anything it
// produces is stored and later rendered in the storefront, it must pass this
// allowlist-style check — no scripts, no event handlers, no external loads.

const FORBIDDEN = [
  /<script/i,
  /<foreignobject/i,
  /<iframe/i,
  /<embed/i,
  /<object/i,
  /<image/i,
  /<use/i,
  /<animate/i,
  /\son[a-z]+\s*=/i, // onload=, onclick=, …
  /javascript:/i,
  /https?:/i, // no external references of any kind
  /data:/i, // no nested data URIs
  /xlink:href/i,
  /\shref\s*=/i,
];

export function sanitizeSvg(raw: string): { ok: true; svg: string } | { ok: false; error: string } {
  const svg = raw.trim();
  if (!svg.startsWith("<svg") || !svg.endsWith("</svg>")) {
    return { ok: false, error: "Artwork must be a single <svg>…</svg> document." };
  }
  if (svg.length > 60_000) {
    return { ok: false, error: "Artwork is too large (60KB max)." };
  }
  // The canonical namespace declaration is the one allowed URL.
  const scannable = svg.replaceAll('xmlns="http://www.w3.org/2000/svg"', "");
  for (const pattern of FORBIDDEN) {
    if (pattern.test(scannable)) {
      return {
        ok: false,
        error: `Artwork contains a forbidden construct (${pattern}). Use plain shapes, paths, gradients and patterns only.`,
      };
    }
  }
  return { ok: true, svg };
}

export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
