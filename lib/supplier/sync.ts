import { prisma } from "@/lib/db";
import { getSupplierAdapter, SUPPLIER_SYNC_ENABLED } from "./adapter";
import type { Prisma } from "@prisma/client";

// The sync job — gated behind SUPPLIER_SYNC_ENABLED (default false).
// It never runs in this build; the seam exists so connecting the supplier
// later touches the adapter only.

export type SyncUpdate = {
  supplierStock?: number;
  supplierPriceCents?: number;
  priceCents?: number;
  lastSyncedAt: Date;
};

// Pure decision: what a sync is allowed to write for one product.
// A sync must NEVER overwrite an admin-entered price on a locked product
// (guardrail 9) — getting this wrong wipes the manual price list.
export function applySyncUpdate(
  product: { priceLocked: boolean },
  incoming: { stock?: number; priceCents?: number },
  now: Date
): SyncUpdate {
  const update: SyncUpdate = { lastSyncedAt: now };
  if (incoming.stock !== undefined) update.supplierStock = incoming.stock;
  if (incoming.priceCents !== undefined) {
    update.supplierPriceCents = incoming.priceCents;
    if (!product.priceLocked) update.priceCents = incoming.priceCents;
  }
  return update;
}

export async function runSupplierSync(): Promise<{ ran: boolean; updated: number }> {
  if (!SUPPLIER_SYNC_ENABLED) return { ran: false, updated: 0 };

  const supplier = await prisma.supplier.findFirst({ where: { enabled: true } });
  if (!supplier) return { ran: false, updated: 0 };

  const run = await prisma.syncRun.create({ data: { supplierId: supplier.id } });
  const adapter = getSupplierAdapter();
  let updated = 0;
  const errors: string[] = [];

  try {
    const products = await prisma.product.findMany({
      where: { supplySource: "SUPPLIER", supplierSku: { not: null } },
    });
    const skus = products.map((p) => p.supplierSku!) ?? [];
    const [stock, pricing] = await Promise.all([
      adapter.fetchStock(skus),
      adapter.fetchPricing(skus),
    ]);
    const now = new Date();
    for (const product of products) {
      const sku = product.supplierSku!;
      if (!(sku in stock) && !(sku in pricing)) continue;
      await prisma.product.update({
        where: { id: product.id },
        data: applySyncUpdate(product, { stock: stock[sku], priceCents: pricing[sku] }, now),
      });
      updated += 1;
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  await prisma.syncRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(),
      updated,
      errors: errors.length ? (errors as unknown as Prisma.InputJsonValue) : undefined,
    },
  });
  return { ran: true, updated };
}
