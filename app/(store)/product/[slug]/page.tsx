import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, productValues, toAttributeDef } from "@/lib/catalog";
import { getAvailability } from "@/lib/supplier/availability";
import { advertisedPriceCents } from "@/lib/pricing";
import { formatMoney } from "@/lib/money";
import { SpecTable } from "@/components/ui/spec-table";
import { StockBadge } from "@/components/ui/stock-badge";
import { Callout } from "@/components/ui/callout";
import { BuyBox } from "@/components/catalog/buy-box";

export const dynamic = "force-dynamic";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return {
    title: `${product.brand.name} ${product.name} — Fullthrottle`,
    description: product.description ?? undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !product.active) notFound();

  const defs = product.section.attributes.map(toAttributeDef);
  const values = productValues(product);
  const availability = getAvailability(product);
  const advertised = advertisedPriceCents(product);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: `${product.brand.name} ${product.name}`,
        sku: product.sku,
        description: product.description ?? undefined,
        brand: { "@type": "Brand", name: product.brand.name },
        offers: {
          "@type": "Offer",
          priceCurrency: "USD",
          price: (product.priceCents / 100).toFixed(2),
          availability: availability.inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "/" },
          {
            "@type": "ListItem",
            position: 2,
            name: product.section.name,
            item: `/${product.section.slug}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: `${product.brand.name} ${product.name}`,
          },
        ],
      },
    ],
  };

  return (
    <main className="px-5 pb-14 pt-8 md:px-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="mb-6 font-mono text-xs text-ink-secondary">
        <Link href="/" className="!text-ink-secondary hover:!text-ink">
          Home
        </Link>{" "}
        /{" "}
        <Link href={`/${product.section.slug}`} className="!text-ink-secondary hover:!text-ink">
          {product.section.name}
        </Link>{" "}
        / {product.brand.name}
      </nav>

      <div className="grid items-start gap-10 lg:grid-cols-[1fr_480px] lg:gap-12">
        <div>
          <div className="img-placeholder relative flex h-[320px] items-center justify-center rounded-1 border border-line md:h-[520px]">
            <span className="absolute left-4 top-4 flex items-center gap-2">
              <Callout n={1} className="bg-surface" />
              <span aria-hidden className="h-[1.5px] w-6 bg-accent" />
            </span>
            <span className="font-mono text-xs text-ink-secondary">
              {product.images[0]?.alt ?? "product photo"}
            </span>
          </div>

          {product.description && (
            <p className="mt-12 mb-8 max-w-[680px] text-[15px] leading-relaxed text-ink">
              {product.description}
            </p>
          )}

          <div className="flex items-baseline justify-between border-b-[1.5px] border-ink pb-2.5">
            <h2 className="font-display text-[28px] font-bold text-ink">SPECIFICATIONS</h2>
            <span className="type-label text-ink-secondary">
              Fiche {product.sku} · Rev A
            </span>
          </div>
          <SpecTable attributes={defs} values={values} className="border-t-0" />
          <p className="pt-2.5 font-mono text-[10px] text-ink-secondary">
            Rows render from the section’s attribute template.
          </p>
        </div>

        <div className="lg:sticky lg:top-6">
          <p className="type-label text-ink-secondary">
            {product.brand.name} · {product.sku}
          </p>
          <h1 className="mt-2 mb-1 font-display text-[36px] font-bold leading-[1.05] text-ink md:text-[44px]">
            {product.name}
          </h1>

          <div className="mt-5 mb-1 font-mono text-[30px] font-medium tabular-nums text-ink">
            {advertised === null ? (
              <span className="text-[20px]">Price shown in cart</span>
            ) : (
              formatMoney(advertised)
            )}
          </div>
          <p className="text-[13px] text-ink-secondary">
            Free shipping over $99 · $9.95 under that
          </p>

          <div className="mt-6 flex items-center gap-3">
            <StockBadge
              state={availability.state}
              qty={availability.state === "low" ? availability.qty : undefined}
            />
            <span className="font-mono text-xs uppercase text-ink-secondary">
              {availability.shipLine}
            </span>
          </div>

          <BuyBox
            productId={product.id}
            productName={product.name}
            inStock={availability.inStock}
            maxQty={Math.max(availability.qty, 1)}
          />

          {product.prop65Warning && (
            <div className="mt-6 flex gap-3 rounded-1 border border-line bg-surface p-3.5">
              <span aria-hidden className="font-mono text-[13px] text-stock-low">
                ⚠
              </span>
              <p className="text-xs leading-relaxed text-ink-secondary">
                <span className="type-label text-stock-low">California Prop 65 </span>
                {product.prop65Warning}
              </p>
            </div>
          )}

          <dl className="mt-7 flex flex-col gap-2.5 border-t border-line pt-4">
            <div className="flex gap-3 text-sm">
              <dt className="type-label w-[90px] shrink-0 text-ink-secondary">Ships from</dt>
              <dd className="m-0">Reno, NV — orders before 2 pm ET leave the same day</dd>
            </div>
            <div className="flex gap-3 text-sm">
              <dt className="type-label w-[90px] shrink-0 text-ink-secondary">Returns</dt>
              <dd className="m-0">30 days, unfitted parts, label on us</dd>
            </div>
            {!product.caLegal && (
              <div className="flex gap-3 text-sm">
                <dt className="type-label w-[90px] shrink-0 text-ink-secondary">California</dt>
                <dd className="m-0 text-stock-low">
                  Not street-legal in California — no CARB exemption. We can’t ship this
                  part to a California address.
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </main>
  );
}
