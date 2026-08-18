import { prisma } from "@/lib/db";
import { requireCatalogAdmin } from "@/lib/admin/guard";
import { SectionsManager, type SectionRow } from "./sections-manager";

export const dynamic = "force-dynamic";

export default async function AdminSectionsPage() {
  await requireCatalogAdmin();
  const sections = await prisma.section.findMany({
    orderBy: { position: "asc" },
    include: {
      brands: { orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } },
      _count: { select: { attributes: true, products: true } },
    },
  });

  const rows: SectionRow[] = sections.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    tagline: s.tagline ?? "",
    attributeCount: s._count.attributes,
    productCount: s._count.products,
    brands: s.brands.map((b) => ({
      id: b.id,
      name: b.name,
      productCount: b._count.products,
    })),
  }));

  return <SectionsManager sections={rows} />;
}
