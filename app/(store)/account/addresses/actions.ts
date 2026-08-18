"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/customer";
import { US_STATES } from "@/lib/us-states";

export type AddressFormState = { error: string } | { ok: true } | null;

const addressSchema = z.object({
  addressId: z.string().optional(),
  line1: z.string().trim().min(1, "Enter a street address."),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1, "Enter a city."),
  state: z.enum(US_STATES, { message: "Pick a state — we ship US-only." }),
  zip: z.string().regex(/^\d{5}$/, "Enter a 5-digit ZIP code."),
  phone: z.string().trim().optional(),
  isDefault: z.boolean(),
});

export async function saveAddressAction(
  _prev: AddressFormState,
  formData: FormData
): Promise<AddressFormState> {
  const user = await requireUser("/account/addresses");
  const parsed = addressSchema.safeParse({
    addressId: formData.get("addressId") || undefined,
    line1: formData.get("line1"),
    line2: formData.get("line2") ?? "",
    city: formData.get("city"),
    state: formData.get("state"),
    zip: formData.get("zip"),
    phone: formData.get("phone") ?? "",
    isDefault: formData.get("isDefault") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    });
  }

  const payload = {
    line1: data.line1,
    line2: data.line2 || null,
    city: data.city,
    state: data.state,
    zip: data.zip,
    phone: data.phone || null,
    isDefault: data.isDefault,
  };

  if (data.addressId) {
    await prisma.address.updateMany({
      where: { id: data.addressId, userId: user.id },
      data: payload,
    });
  } else {
    const count = await prisma.address.count({ where: { userId: user.id } });
    await prisma.address.create({
      data: { ...payload, userId: user.id, isDefault: data.isDefault || count === 0 },
    });
  }
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
  const user = await requireUser("/account/addresses");
  const addressId = formData.get("addressId");
  if (typeof addressId !== "string") return;
  await prisma.address.deleteMany({ where: { id: addressId, userId: user.id } });
  revalidatePath("/account/addresses");
}
