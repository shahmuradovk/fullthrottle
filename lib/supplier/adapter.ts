import type { Order } from "@prisma/client";

// The supplier seam (engineering brief §9). The API is NOT connected in this
// build — connecting it later touches this file only.
export interface SupplierAdapter {
  fetchStock(skus: string[]): Promise<Record<string, number>>;
  fetchPricing(skus: string[]): Promise<Record<string, number>>; // cents
  placePurchaseOrder(order: Order): Promise<{ poNumber: string }>;
  fetchTracking(
    poNumber: string
  ): Promise<{ carrier: string; trackingNumber: string } | null>;
}

// The only implementation for now — every method resolves empty.
export class ManualAdapter implements SupplierAdapter {
  async fetchStock(): Promise<Record<string, number>> {
    return {};
  }
  async fetchPricing(): Promise<Record<string, number>> {
    return {};
  }
  async placePurchaseOrder(): Promise<{ poNumber: string }> {
    throw new Error("Supplier integration is not connected (SUPPLIER_SYNC_ENABLED=false).");
  }
  async fetchTracking(): Promise<{ carrier: string; trackingNumber: string } | null> {
    return null;
  }
}

export const SUPPLIER_SYNC_ENABLED = process.env.SUPPLIER_SYNC_ENABLED === "true";

export function getSupplierAdapter(): SupplierAdapter {
  return new ManualAdapter();
}
