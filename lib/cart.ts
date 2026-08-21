import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { getAvailability } from "@/lib/supplier/availability";

export const CART_COOKIE = "ft_cart";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

// Read-only view of the current cart (safe in Server Components — never
// creates the cookie).
export async function readCart() {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  if (!token) return null;
  return prisma.cart.findUnique({
    where: { token },
    include: {
      items: {
        include: {
          product: {
            include: {
              brand: true,
              images: { orderBy: { position: "asc" }, take: 1 },
            },
          },
        },
        orderBy: { id: "asc" },
      },
    },
  });
}

export async function cartCount(): Promise<number> {
  const cart = await readCart();
  return cart?.items.reduce((s, i) => s + i.qty, 0) ?? 0;
}

// Get or create the cart. Only callable from Server Actions / Route Handlers
// (sets the httpOnly cookie).
export async function getOrCreateCart() {
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  if (token) {
    const existing = await prisma.cart.findUnique({ where: { token } });
    if (existing) return existing;
  }
  const fresh = await prisma.cart.create({
    data: { token: randomBytes(24).toString("base64url") },
  });
  store.set(CART_COOKIE, fresh.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CART_COOKIE_MAX_AGE,
    path: "/",
  });
  return fresh;
}

// Clamp requested qty to what is actually available right now.
export async function addItem(productId: string, qty: number) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.active) throw new Error("This product is no longer available.");
  const availability = getAvailability(product);
  if (!availability.inStock) throw new Error("This product is out of stock.");

  const cart = await getOrCreateCart();
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });
  const nextQty = Math.min((existing?.qty ?? 0) + Math.max(1, qty), availability.qty);
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    create: { cartId: cart.id, productId, qty: nextQty },
    update: { qty: nextQty },
  });
}

export async function setItemQty(productId: string, qty: number) {
  const cart = await readCart();
  if (!cart) return;
  if (qty <= 0) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
    return;
  }
  const product = await prisma.product.findUnique({ where: { id: productId } });
  const cap = product ? Math.max(getAvailability(product).qty, 1) : 1;
  await prisma.cartItem.updateMany({
    where: { cartId: cart.id, productId },
    data: { qty: Math.min(qty, cap) },
  });
}

export async function removeItem(productId: string) {
  const cart = await readCart();
  if (!cart) return;
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
}

// On sign-in the cookie cart merges into the user's cart (engineering brief §5).
export async function mergeCartIntoUser(userId: string) {
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  if (!token) return;
  const anon = await prisma.cart.findUnique({ where: { token }, include: { items: true } });
  if (!anon) return;
  if (anon.userId === userId) return;

  const existing = await prisma.cart.findUnique({
    where: { userId },
    include: { items: true },
  });

  if (!existing) {
    if (anon.userId === null) {
      await prisma.cart.update({ where: { id: anon.id }, data: { userId } });
      return;
    }
    return;
  }

  for (const item of anon.items) {
    const match = existing.items.find((i) => i.productId === item.productId);
    if (match) {
      await prisma.cartItem.update({
        where: { id: match.id },
        data: { qty: match.qty + item.qty },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: existing.id, productId: item.productId, qty: item.qty },
      });
    }
  }
  await prisma.cart.delete({ where: { id: anon.id } });
  store.set(CART_COOKIE, existing.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CART_COOKIE_MAX_AGE,
    path: "/",
  });
}
