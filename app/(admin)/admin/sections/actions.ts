"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCatalogAdmin } from "@/lib/admin/guard";
import { writeAudit } from "@/lib/audit";
import { slugify } from "@/lib/slug";

export type SectionFormState = { error: string } | null;

export async function createSectionAction(
  _prev: SectionFormState,
  formData: FormData
): Promise<SectionFormState> {
  const session = await requireCatalogAdmin();
  const parsed = z
    .object({ name: z.string().trim().min(2, "Enter a section name.") })
    .safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const slug = slugify(parsed.data.name);
  if (!slug) return { error: "Enter a section name." };
  const exists = await prisma.section.findUnique({ where: { slug } });
  if (exists) return { error: "A section with that name already exists." };

  const position = (await prisma.section.count()) + 1;
  const section = await prisma.section.create({
    data: { name: parsed.data.name.trim(), slug, position },
  });
  await writeAudit({
    actorId: session.adminId,
    action: "section.create",
    entity: "Section",
    entityId: section.id,
    after: section,
  });
  revalidatePath("/", "layout");
  return null;
}

export async function updateSectionTaglineAction(formData: FormData): Promise<void> {
  const session = await requireCatalogAdmin();
  const parsed = z
    .object({ sectionId: z.string().min(1), tagline: z.string().max(200) })
    .safeParse({
      sectionId: formData.get("sectionId"),
      tagline: formData.get("tagline") ?? "",
    });
  if (!parsed.success) return;
  const before = await prisma.section.findUnique({ where: { id: parsed.data.sectionId } });
  if (!before) return;
  const after = await prisma.section.update({
    where: { id: parsed.data.sectionId },
    data: { tagline: parsed.data.tagline.trim() || null },
  });
  await writeAudit({
    actorId: session.adminId,
    action: "section.update",
    entity: "Section",
    entityId: after.id,
    before,
    after,
  });
  revalidatePath("/", "layout");
}

export type DeleteSectionState = { error: string } | null;

export async function deleteSectionAction(
  _prev: DeleteSectionState,
  formData: FormData
): Promise<DeleteSectionState> {
  const session = await requireCatalogAdmin();
  const sectionId = formData.get("sectionId");
  if (typeof sectionId !== "string") return null;
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: { _count: { select: { products: true } } },
  });
  if (!section) return null;
  if (section._count.products > 0) {
    return {
      error: `${section.name} still has ${section._count.products} products. Move or delete them first.`,
    };
  }
  await prisma.section.delete({ where: { id: sectionId } });
  await writeAudit({
    actorId: session.adminId,
    action: "section.delete",
    entity: "Section",
    entityId: sectionId,
    before: section,
  });
  revalidatePath("/", "layout");
  return null;
}

export async function addBrandAction(formData: FormData): Promise<void> {
  const session = await requireCatalogAdmin();
  const parsed = z
    .object({ sectionId: z.string().min(1), name: z.string().trim().min(1) })
    .safeParse({ sectionId: formData.get("sectionId"), name: formData.get("name") });
  if (!parsed.success) return;
  const slug = slugify(parsed.data.name);
  if (!slug) return;
  const exists = await prisma.brand.findUnique({
    where: { sectionId_slug: { sectionId: parsed.data.sectionId, slug } },
  });
  if (exists) return;
  const brand = await prisma.brand.create({
    data: { sectionId: parsed.data.sectionId, name: parsed.data.name.trim(), slug },
  });
  await writeAudit({
    actorId: session.adminId,
    action: "brand.create",
    entity: "Brand",
    entityId: brand.id,
    after: brand,
  });
  revalidatePath("/", "layout");
}

export type RemoveBrandState = { error: string } | null;

export async function removeBrandAction(
  _prev: RemoveBrandState,
  formData: FormData
): Promise<RemoveBrandState> {
  const session = await requireCatalogAdmin();
  const brandId = formData.get("brandId");
  if (typeof brandId !== "string") return null;
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: { _count: { select: { products: true } } },
  });
  if (!brand) return null;
  if (brand._count.products > 0) {
    return {
      error: `${brand.name} still has ${brand._count.products} products. Reassign or delete them first.`,
    };
  }
  await prisma.brand.delete({ where: { id: brandId } });
  await writeAudit({
    actorId: session.adminId,
    action: "brand.delete",
    entity: "Brand",
    entityId: brandId,
    before: brand,
  });
  revalidatePath("/", "layout");
  return null;
}
