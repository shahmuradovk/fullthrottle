import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const [sections, products] = await Promise.all([
    prisma.section.findMany(),
    prisma.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
  ]);
  return [
    { url: base, changeFrequency: "daily" },
    ...sections.map((s) => ({
      url: `${base}/${s.slug}`,
      changeFrequency: "daily" as const,
    })),
    ...products.map((p) => ({
      url: `${base}/product/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "daily" as const,
    })),
  ];
}
