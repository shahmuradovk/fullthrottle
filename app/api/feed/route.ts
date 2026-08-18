import { prisma } from "@/lib/db";
import { getAvailability } from "@/lib/supplier/availability";
import { advertisedPriceCents } from "@/lib/pricing";
import { productValues } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// Daily product feed (JSONL) — AI shopping agents and marketplaces consume it
// (engineering brief §11). Prices honour MAP: products whose price can't be
// advertised are listed without one.
export async function GET() {
  const base = (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { brand: true, section: true },
    orderBy: { sku: "asc" },
  });

  const lines = products.map((p) => {
    const availability = getAvailability(p);
    const advertised = advertisedPriceCents(p);
    return JSON.stringify({
      sku: p.sku,
      name: `${p.brand.name} ${p.name}`,
      brand: p.brand.name,
      section: p.section.name,
      url: `${base}/product/${p.slug}`,
      price_usd: advertised === null ? undefined : (advertised / 100).toFixed(2),
      availability: availability.label,
      in_stock: availability.inStock,
      attributes: productValues(p),
      prop65_warning: p.prop65Warning ?? undefined,
      ca_street_legal: p.caLegal,
    });
  });

  return new Response(lines.join("\n") + "\n", {
    headers: {
      "content-type": "application/jsonl; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
