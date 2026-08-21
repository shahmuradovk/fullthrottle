import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { canChangePrices, requireCatalogAdmin } from "@/lib/admin/guard";
import { productValues, toAttributeDef } from "@/lib/catalog";
import { ProductForm } from "../product-form";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCatalogAdmin();
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      section: {
        include: {
          attributes: { orderBy: { position: "asc" } },
          brands: { orderBy: { name: "asc" } },
        },
      },
      images: { select: { url: true, alt: true }, orderBy: { position: "asc" }, take: 1 },
    },
  });
  if (!product) notFound();

  return (
    <div>
      <p className="mb-1.5 font-mono text-[11px] text-ink-secondary">
        Products / {product.name}
      </p>
      <ProductForm
        sectionId={product.sectionId}
        sectionName={product.section.name}
        brands={product.section.brands.map((b) => ({ id: b.id, name: b.name }))}
        attributes={product.section.attributes.map(toAttributeDef)}
        product={{
          id: product.id,
          brandId: product.brandId,
          name: product.name,
          sku: product.sku,
          price: (product.priceCents / 100).toFixed(2),
          stock: String(product.stock),
          supplierSku: product.supplierSku ?? "",
          description: product.description ?? "",
          active: product.active,
          values: productValues(product),
          prop65: product.prop65Warning ?? "",
          carbEoNumber: product.carbEoNumber ?? "",
          caLegal: product.caLegal,
          hazmatClass: product.hazmatClass ?? "",
          oversizeFreight: product.oversizeFreight,
        }}
        currentImage={product.images[0] ?? null}
        canEditPrice={canChangePrices(session)}
      />
    </div>
  );
}
