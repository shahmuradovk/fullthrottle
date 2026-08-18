"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCatalogAdmin } from "@/lib/admin/guard";
import { writeAudit } from "@/lib/audit";
import { slugify } from "@/lib/slug";
import { AttributeType } from "@prisma/client";

export type AttributeFormState = { error: string } | null;

const parseOptions = (raw: unknown): string[] =>
  typeof raw === "string"
    ? raw
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean)
    : [];

export async function createAttributeAction(
  _prev: AttributeFormState,
  formData: FormData
): Promise<AttributeFormState> {
  const session = await requireCatalogAdmin();
  const parsed = z
    .object({
      sectionId: z.string().min(1),
      name: z.string().trim().min(1, "Enter an attribute name."),
      type: z.nativeEnum(AttributeType),
      unit: z.string().trim().max(20).optional(),
      filterable: z.boolean(),
    })
    .safeParse({
      sectionId: formData.get("sectionId"),
      name: formData.get("name"),
      type: formData.get("type"),
      unit: formData.get("unit") ?? "",
      filterable: formData.get("filterable") === "on",
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const options = parseOptions(formData.get("options"));
  if (
    (parsed.data.type === "SELECT" || parsed.data.type === "MULTISELECT") &&
    options.length === 0
  ) {
    return { error: "List the options, separated by commas." };
  }

  // key is generated once from the name and never mutated afterwards —
  // renames must not break stored values or bookmarked filter URLs.
  const key = slugify(parsed.data.name);
  if (!key) return { error: "Enter an attribute name." };
  const exists = await prisma.attribute.findUnique({
    where: { sectionId_key: { sectionId: parsed.data.sectionId, key } },
  });
  if (exists) return { error: "This section already has an attribute with that key." };

  const position = await prisma.attribute.count({
    where: { sectionId: parsed.data.sectionId },
  });
  const attribute = await prisma.attribute.create({
    data: {
      sectionId: parsed.data.sectionId,
      key,
      name: parsed.data.name.trim(),
      type: parsed.data.type,
      options,
      unit: parsed.data.unit || null,
      filterable: parsed.data.filterable,
      position,
    },
  });
  await writeAudit({
    actorId: session.adminId,
    action: "attribute.create",
    entity: "Attribute",
    entityId: attribute.id,
    after: attribute,
  });
  revalidatePath("/", "layout");
  return null;
}

export async function updateAttributeAction(
  _prev: AttributeFormState,
  formData: FormData
): Promise<AttributeFormState> {
  const session = await requireCatalogAdmin();
  const parsed = z
    .object({
      attributeId: z.string().min(1),
      name: z.string().trim().min(1, "Enter an attribute name."),
      unit: z.string().trim().max(20).optional(),
      filterable: z.boolean(),
    })
    .safeParse({
      attributeId: formData.get("attributeId"),
      name: formData.get("name"),
      unit: formData.get("unit") ?? "",
      filterable: formData.get("filterable") === "on",
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const before = await prisma.attribute.findUnique({
    where: { id: parsed.data.attributeId },
  });
  if (!before) return null;

  const options = parseOptions(formData.get("options"));
  if (
    (before.type === "SELECT" || before.type === "MULTISELECT") &&
    options.length === 0
  ) {
    return { error: "List the options, separated by commas." };
  }

  // type and key stay fixed after create — changing them would orphan values.
  const after = await prisma.attribute.update({
    where: { id: before.id },
    data: {
      name: parsed.data.name.trim(),
      options,
      unit: parsed.data.unit || null,
      filterable: parsed.data.filterable,
    },
  });
  await writeAudit({
    actorId: session.adminId,
    action: "attribute.update",
    entity: "Attribute",
    entityId: after.id,
    before,
    after,
  });
  revalidatePath("/", "layout");
  return null;
}

export async function deleteAttributeAction(formData: FormData): Promise<void> {
  const session = await requireCatalogAdmin();
  const attributeId = formData.get("attributeId");
  if (typeof attributeId !== "string") return;
  const before = await prisma.attribute.findUnique({ where: { id: attributeId } });
  if (!before) return;
  await prisma.attribute.delete({ where: { id: attributeId } });
  await writeAudit({
    actorId: session.adminId,
    action: "attribute.delete",
    entity: "Attribute",
    entityId: attributeId,
    before,
  });
  revalidatePath("/", "layout");
}
