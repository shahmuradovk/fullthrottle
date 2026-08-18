import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { canChangePrices, requireCatalogAdmin } from "@/lib/admin/guard";
import { toAttributeDef } from "@/lib/catalog";
import { ProductForm } from "../product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const session = await requireCatalogAdmin();
  const { section: sectionId } = await searchParams;
  if (!sectionId) notFound();

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: {
      attributes: { orderBy: { position: "asc" } },
      brands: { orderBy: { name: "asc" } },
    },
  });
  if (!section || section.attributes.length === 0) notFound();

  return (
    <div>
      <p className="mb-1.5 font-mono text-[11px] text-ink-secondary">
        Products / New product
      </p>
      <ProductForm
        sectionId={section.id}
        sectionName={section.name}
        brands={section.brands.map((b) => ({ id: b.id, name: b.name }))}
        attributes={section.attributes.map(toAttributeDef)}
        product={null}
        canEditPrice={canChangePrices(session)}
      />
    </div>
  );
}
