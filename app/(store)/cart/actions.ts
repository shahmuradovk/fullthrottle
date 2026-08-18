"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addItem, removeItem, setItemQty } from "@/lib/cart";

const addSchema = z.object({
  productId: z.string().min(1),
  qty: z.coerce.number().int().min(1).max(99),
});

export type CartActionResult = { ok: true } | { ok: false; error: string };

// Adapter for useActionState in the PDP buy box.
export async function addToCartStateAction(
  _prev: CartActionResult | null,
  formData: FormData
): Promise<CartActionResult> {
  return addToCartAction(formData);
}

export async function addToCartAction(formData: FormData): Promise<CartActionResult> {
  const parsed = addSchema.safeParse({
    productId: formData.get("productId"),
    qty: formData.get("qty") ?? 1,
  });
  if (!parsed.success) return { ok: false, error: "Couldn't add that to the cart." };
  try {
    await addItem(parsed.data.productId, parsed.data.qty);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't add that to the cart." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

const qtySchema = z.object({
  productId: z.string().min(1),
  qty: z.coerce.number().int().min(0).max(99),
});

export async function setCartQtyAction(formData: FormData): Promise<void> {
  const parsed = qtySchema.safeParse({
    productId: formData.get("productId"),
    qty: formData.get("qty"),
  });
  if (!parsed.success) return;
  await setItemQty(parsed.data.productId, parsed.data.qty);
  revalidatePath("/", "layout");
}

export async function removeFromCartAction(formData: FormData): Promise<void> {
  const productId = formData.get("productId");
  if (typeof productId !== "string" || !productId) return;
  await removeItem(productId);
  revalidatePath("/", "layout");
}
