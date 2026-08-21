import Link from "next/link";
import type { Brand, Product } from "@prisma/client";
import type { AttributeDef } from "@/lib/attributes/types";
import { formatAttributeValue } from "@/lib/attributes/format";
import { productValues } from "@/lib/catalog";
import { getAvailability } from "@/lib/supplier/availability";
import { advertisedPriceCents } from "@/lib/pricing";
import { artWellClass, resolveProductArt } from "@/lib/product-art";
import { formatMoney } from "@/lib/money";
import { StockBadge } from "@/components/ui/stock-badge";
import { Callout } from "@/components/ui/callout";

type CardProduct = Omit<Product, "values"> & {
  values: unknown;
  brand: Brand;
  images?: { url: string }[];
};

export function ProductCard({
  product,
  attributes,
  calloutN,
}: {
  product: CardProduct;
  attributes: AttributeDef[];
  calloutN: number;
}) {
  const values = productValues(product);
  const art = resolveProductArt(product.slug, product.images);
  const specLine = attributes
    .filter((a) => a.filterable)
    .sort((a, b) => a.position - b.position)
    .map((a) => formatAttributeValue(a, values[a.key]))
    .filter((v): v is string => v !== null)
    .slice(0, 3)
    .join(" · ");
  const availability = getAvailability(product);
  const advertised = advertisedPriceCents(product);

  return (
    <Link
      href={`/product/${product.slug}`}
      className="block overflow-hidden rounded-1 border border-line bg-surface !text-ink !no-underline transition-[border-color] duration-(--dur-fast) hover:border-ink"
    >
      <div
        className={`relative flex h-[180px] items-center justify-center ${artWellClass(art)}`}
      >
        <Callout n={calloutN} className="absolute left-3 top-3 z-10 bg-surface" />
        {art ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={art}
            alt={`${product.brand.name} ${product.name}`}
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <span className="font-mono text-[11px] text-ink-secondary">product photo</span>
        )}
      </div>
      <div className="flex flex-col gap-1.5 p-4">
        <p className="type-label text-ink-secondary">
          {product.brand.name} · {product.sku}
        </p>
        <p className="text-[19px] font-semibold leading-snug">{product.name}</p>
        {specLine && (
          <p className="font-mono text-xs text-ink-secondary">{specLine}</p>
        )}
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <StockBadge
            state={availability.state}
            qty={availability.state === "low" ? availability.qty : undefined}
          />
          <span className="type-data !text-[15px]">
            {advertised === null ? "Price in cart" : formatMoney(advertised)}
          </span>
        </div>
      </div>
    </Link>
  );
}
