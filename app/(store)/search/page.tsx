import { prisma } from "@/lib/db";
import { searchProducts, toAttributeDef } from "@/lib/catalog";
import { ProductCard } from "@/components/catalog/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";


export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = await searchProducts(q);

  const sectionIds = [...new Set(results.map((r) => r.sectionId))];
  const attributes = await prisma.attribute.findMany({
    where: { sectionId: { in: sectionIds } },
    orderBy: { position: "asc" },
  });
  const defsBySection = Object.fromEntries(
    sectionIds.map((id) => [
      id,
      attributes.filter((a) => a.sectionId === id).map(toAttributeDef),
    ])
  );
  const sectionCount = new Set(results.map((r) => r.section.name)).size;

  return (
    <main className="px-5 py-10 md:px-10">
      <form action="/search" className="mb-6 max-w-[440px] md:hidden">
        <label htmlFor="search-page-q" className="sr-only">
          Search part number or name
        </label>
        <div className="flex items-center gap-2.5 rounded-1 border border-line bg-surface px-3">
          <span aria-hidden className="font-mono text-xs text-ink-secondary">
            ⌕
          </span>
          <input
            id="search-page-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search part number or name"
            className="w-full bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-ink-secondary"
          />
        </div>
      </form>
      <h1 className="mb-6 font-display text-[32px] font-bold text-ink">
        {q ? (
          <>
            RESULTS FOR “{q}”{" "}
            <span className="font-mono text-sm font-normal text-ink-secondary">
              · {results.length} {results.length === 1 ? "product" : "products"}
              {sectionCount > 1 ? ` across ${sectionCount} sections` : ""}
            </span>
          </>
        ) : (
          "SEARCH"
        )}
      </h1>

      {results.length === 0 ? (
        <EmptyState
          title={q ? "Nothing matched that search" : "Type a part number, brand, or name"}
          body={q ? "Try a brand or a part number." : undefined}
          action={
            <Button variant="secondary" asChildHref="/">
              Browse sections instead
            </Button>
          }
          className="mx-auto max-w-[560px]"
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              attributes={defsBySection[p.sectionId] ?? []}
              calloutN={i + 1}
            />
          ))}
        </div>
      )}
    </main>
  );
}
