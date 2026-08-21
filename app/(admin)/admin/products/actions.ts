"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { canChangePrices, requireCatalogAdmin } from "@/lib/admin/guard";
import { writeAudit } from "@/lib/audit";
import { slugify } from "@/lib/slug";
import { fetchImage, storeProductImage } from "@/lib/product-images";
import type { AttributeValue, AttributeValues } from "@/lib/attributes/types";
import type { Attribute } from "@prisma/client";

export type ProductFormState = { error: string } | null;

const baseSchema = z.object({
  sectionId: z.string().min(1),
  productId: z.string().optional(),
  brandId: z.string().min(1, "Select a brand."),
  name: z.string().trim().min(1, "Enter a product name."),
  sku: z.string().trim().min(1, "Enter a SKU."),
  price: z.coerce.number().min(0, "Enter a price of 0 or more."),
  stock: z.coerce.number().int().min(0, "Stock can't be negative."),
  supplierSku: z.string().trim().optional(),
  description: z.string().trim().optional(),
  publish: z.enum(["draft", "publish"]),
  imageUrl: z.string().trim().optional(),
  // US compliance
  prop65: z.string().trim().optional(),
  carbEoNumber: z.string().trim().optional(),
  caLegal: z.boolean(),
  hazmatClass: z.string().trim().optional(),
  oversizeFreight: z.boolean(),
});

function readValues(formData: FormData, attributes: Attribute[]): AttributeValues {
  const values: AttributeValues = {};
  for (const attr of attributes) {
    const field = `attr_${attr.key}`;
    let value: AttributeValue = null;
    switch (attr.type) {
      case "MULTISELECT": {
        const picked = formData.getAll(field).map(String).filter(Boolean);
        value = picked.length ? picked : null;
        break;
      }
      case "NUMBER": {
        const raw = formData.get(field);
        value =
          typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw))
            ? Number(raw)
            : null;
        break;
      }
      case "BOOLEAN": {
        const raw = formData.get(field);
        value = raw === "true" ? true : raw === "false" ? false : null;
        break;
      }
      default: {
        const raw = formData.get(field);
        value = typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
      }
    }
    if (value !== null) values[attr.key] = value;
  }
  return values;
}

export async function saveProductAction(
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const session = await requireCatalogAdmin();
  const parsed = baseSchema.safeParse({
    sectionId: formData.get("sectionId"),
    productId: formData.get("productId") || undefined,
    brandId: formData.get("brandId"),
    name: formData.get("name"),
    sku: formData.get("sku"),
    price: formData.get("price"),
    stock: formData.get("stock"),
    supplierSku: formData.get("supplierSku") ?? "",
    description: formData.get("description") ?? "",
    publish: formData.get("publish") === "publish" ? "publish" : "draft",
    imageUrl: formData.get("imageUrl") ?? "",
    prop65: formData.get("prop65") ?? "",
    carbEoNumber: formData.get("carbEoNumber") ?? "",
    caLegal: formData.get("caLegal") !== "off-market",
    hazmatClass: formData.get("hazmatClass") ?? "",
    oversizeFreight: formData.get("oversizeFreight") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const attributes = await prisma.attribute.findMany({
    where: { sectionId: data.sectionId },
    orderBy: { position: "asc" },
  });
  if (attributes.length === 0) {
    return { error: "This section has no attributes yet. Build its template first." };
  }
  const values = readValues(formData, attributes);

  const priceCents = Math.round(data.price * 100);
  const existing = data.productId
    ? await prisma.product.findUnique({ where: { id: data.productId } })
    : null;
  const brand = await prisma.brand.findUnique({ where: { id: data.brandId } });

  // Fetch the photo up front so a bad URL fails the form before anything saves.
  let photo: { bytes: Buffer; contentType: string } | null = null;
  if (data.imageUrl) {
    const fetched = await fetchImage(data.imageUrl);
    if (!fetched.ok) return { error: `Photo: ${fetched.error}` };
    photo = fetched;
  }

  // CONTENT cannot change prices (engineering brief §5).
  const allowPrice = canChangePrices(session);
  const finalPriceCents = existing
    ? allowPrice
      ? priceCents
      : existing.priceCents
    : allowPrice
      ? priceCents
      : 0;

  const common = {
    brandId: data.brandId,
    name: data.name,
    sku: data.sku,
    priceCents: finalPriceCents,
    stock: data.stock,
    supplierSku: data.supplierSku || null,
    description: data.description || null,
    active: data.publish === "publish",
    values,
    prop65Warning: data.prop65 || null,
    carbEoNumber: data.carbEoNumber || null,
    caLegal: data.caLegal,
    hazmatClass: data.hazmatClass || null,
    oversizeFreight: data.oversizeFreight,
  };

  let savedId: string;
  try {
    if (existing) {
      const after = await prisma.product.update({
        where: { id: existing.id },
        data: common,
      });
      await writeAudit({
        actorId: session.adminId,
        action: "product.update",
        entity: "Product",
        entityId: after.id,
        before: existing,
        after,
      });
      savedId = after.id;
    } else {
      const slugBase = slugify(`${data.name}`);
      const slug = slugify(`${brand?.slug ?? ""} ${slugBase}`);
      const created = await prisma.product.create({
        data: { ...common, sectionId: data.sectionId, slug },
      });
      await writeAudit({
        actorId: session.adminId,
        action: "product.create",
        entity: "Product",
        entityId: created.id,
        after: created,
      });
      savedId = created.id;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("Unique constraint")) {
      return { error: "That SKU or product name is already in the catalog." };
    }
    throw e;
  }

  if (photo && data.imageUrl) {
    const image = await storeProductImage({
      productId: savedId,
      bytes: photo.bytes,
      contentType: photo.contentType,
      alt: `${brand?.name ?? ""} ${data.name}`.trim(),
      sourceUrl: data.imageUrl,
    });
    await writeAudit({
      actorId: session.adminId,
      action: "product.image",
      entity: "ProductImage",
      entityId: image.id,
      after: {
        productId: savedId,
        sourceUrl: data.imageUrl,
        contentType: photo.contentType,
        bytes: photo.bytes.length,
      },
    });
  }

  revalidatePath("/", "layout");
  redirect(`/admin/products?section=${data.sectionId}`);
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const session = await requireCatalogAdmin();
  const productId = formData.get("productId");
  if (typeof productId !== "string") return;
  const before = await prisma.product.findUnique({ where: { id: productId } });
  if (!before) return;
  await prisma.product.delete({ where: { id: productId } });
  await writeAudit({
    actorId: session.adminId,
    action: "product.delete",
    entity: "Product",
    entityId: productId,
    before,
  });
  revalidatePath("/", "layout");
}
