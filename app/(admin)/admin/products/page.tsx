import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCatalogAdmin } from "@/lib/admin/guard";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { deleteProductAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  await requireCatalogAdmin();
  const { section: sectionParam } = await searchParams;
  const sections = await prisma.section.findMany({ orderBy: { position: "asc" } });
  const active = sections.find((s) => s.id === sectionParam) ?? sections[0];

  if (!active) {
    return (
      <EmptyState
        title="No sections yet"
        body="Create a section and its attribute template before adding products."
      />
    );
  }

  const products = await prisma.product.findMany({
    where: { sectionId: active.id },
    include: { brand: true },
    orderBy: { name: "asc" },
  });
  const attributeCount = await prisma.attribute.count({ where: { sectionId: active.id } });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[28px] font-bold text-ink">PRODUCTS</h1>
        <div className="flex flex-wrap items-center gap-2">
          {sections.map((s) => (
            <Link
              key={s.id}
              href={`/admin/products?section=${s.id}`}
              className={cn(
                "rounded-pill border px-3 py-1.5 font-mono text-xs !no-underline",
                s.id === active.id
                  ? "border-accent bg-accent !text-accent-ink"
                  : "border-line !text-ink hover:border-ink"
              )}
            >
              {s.name}
            </Link>
          ))}
          {attributeCount > 0 && (
            <Button size="small" asChildHref={`/admin/products/new?section=${active.id}`}>
              New product
            </Button>
          )}
        </div>
      </div>

      {attributeCount === 0 ? (
        <EmptyState
          title={`${active.name} has no attribute template yet`}
          body="Products can't be added until the section has at least one attribute."
          action={
            <Button
              variant="secondary"
              size="small"
              asChildHref={`/admin/attributes?section=${active.id}`}
            >
              Build the template
            </Button>
          }
        />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products in this section"
          body="Add the first one — the form already carries this section's fields."
          action={
            <Button size="small" asChildHref={`/admin/products/new?section=${active.id}`}>
              New product
            </Button>
          }
        />
      ) : (
        <div className="rounded-1 border border-line bg-surface">
          <div className="grid grid-cols-[1fr_150px_100px_80px_90px_130px] gap-2.5 border-b-[1.5px] border-ink px-4 py-2.5 max-lg:hidden">
            {["Product", "SKU", "Price", "Stock", "State", ""].map((h, i) => (
              <span key={i} className="type-label text-ink-secondary">
                {h}
              </span>
            ))}
          </div>
          {products.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-[1fr_150px_100px_80px_90px_130px] items-center gap-2.5 border-b border-line px-4 py-2.5 max-lg:grid-cols-2"
            >
              <span className="text-sm text-ink">
                {p.brand.name} {p.name}
              </span>
              <span className="font-mono text-xs text-ink-secondary">{p.sku}</span>
              <span className="font-mono text-xs text-ink">{formatMoney(p.priceCents)}</span>
              <span className="font-mono text-xs text-ink">{p.stock}</span>
              <span
                className={cn(
                  "justify-self-start rounded-1 border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.05em]",
                  p.active
                    ? "border-stock-in text-stock-in"
                    : "border-dashed border-ink-secondary text-ink-secondary"
                )}
              >
                {p.active ? "Live" : "Draft"}
              </span>
              <span className="flex items-center justify-end gap-3">
                <Link
                  href={`/admin/products/${p.id}`}
                  className="text-[13px] !text-link hover:underline"
                >
                  Edit
                </Link>
                <form action={deleteProductAction}>
                  <input type="hidden" name="productId" value={p.id} />
                  <button
                    type="submit"
                    className="cursor-pointer border-none bg-transparent p-0 text-[13px] text-error hover:underline"
                  >
                    Delete
                  </button>
                </form>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
