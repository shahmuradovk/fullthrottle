import { prisma } from "@/lib/db";
import type { AttributeDef, AttributeValues } from "@/lib/attributes/types";
import type { Attribute, Brand, Product, Section } from "@prisma/client";
import {
  applyFilters,
  parseFilters,
  type FilterState,
  type SearchParamsLike,
} from "@/lib/attributes/filter";

export const PAGE_SIZE = 12;

export function toAttributeDef(a: Attribute): AttributeDef {
  return {
    id: a.id,
    key: a.key,
    name: a.name,
    type: a.type,
    options: a.options,
    unit: a.unit,
    filterable: a.filterable,
    position: a.position,
  };
}

export function productValues(p: { values: unknown }): AttributeValues {
  return (p.values ?? {}) as AttributeValues;
}

export async function getSections(): Promise<Section[]> {
  return prisma.section.findMany({ orderBy: { position: "asc" } });
}

export async function getSectionBySlug(slug: string) {
  return prisma.section.findUnique({
    where: { slug },
    include: {
      attributes: { orderBy: { position: "asc" } },
      brands: { orderBy: { name: "asc" } },
    },
  });
}

export type ShapedProduct = Omit<Product, "values"> & {
  values: AttributeValues;
  brand: Brand;
};

export type ListingResult = {
  state: FilterState;
  products: ShapedProduct[];
  pageItems: ShapedProduct[];
  total: number;
  totalPages: number;
  all: ShapedProduct[]; // section's full active set, for facets
};

export async function listSectionProducts(
  sectionId: string,
  attributes: Attribute[],
  brands: Brand[],
  searchParams: SearchParamsLike
): Promise<ListingResult> {
  const all = await prisma.product.findMany({
    where: { sectionId, active: true },
    include: { brand: true },
  });

  const defs = attributes.map(toAttributeDef);
  const brandIdBySlug = Object.fromEntries(brands.map((b) => [b.slug, b.id]));
  const state = parseFilters(searchParams, defs, brandIdBySlug);

  const shaped = all.map((p) => ({ ...p, values: productValues(p) }));
  const filtered = applyFilters(shaped, state, (p) => p.name);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(state.page, totalPages);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return {
    state: { ...state, page },
    products: filtered,
    pageItems,
    total,
    totalPages,
    all: shaped,
  };
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      section: { include: { attributes: { orderBy: { position: "asc" } } } },
      images: { orderBy: { position: "asc" } },
    },
  });
}

export async function searchProducts(query: string) {
  const q = query.trim();
  if (!q) return [];
  return prisma.product.findMany({
    where: {
      active: true,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    include: { brand: true, section: true },
    orderBy: { name: "asc" },
    take: 60,
  });
}
