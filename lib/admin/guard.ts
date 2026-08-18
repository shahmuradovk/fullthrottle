import { redirect } from "next/navigation";
import type { AdminRole } from "@prisma/client";
import { readAdminSession, type AdminSession } from "./session";

// Role capability map (engineering brief §5):
//   OWNER / MANAGER — everything
//   CONTENT — catalog content, but cannot change prices
//   ORDERS  — can only advance order status and add tracking
const CATALOG_ROLES: AdminRole[] = ["OWNER", "MANAGER", "CONTENT"];
const ORDER_ROLES: AdminRole[] = ["OWNER", "MANAGER", "ORDERS"];

export async function requireAdmin(): Promise<AdminSession> {
  const session = await readAdminSession();
  if (!session || session.stage !== "full") redirect("/admin/sign-in");
  return session;
}

export async function requireAdminRole(allowed: AdminRole[]): Promise<AdminSession> {
  const session = await requireAdmin();
  if (!allowed.includes(session.role)) redirect("/admin");
  return session;
}

export const requireCatalogAdmin = () => requireAdminRole(CATALOG_ROLES);
export const requireOrdersAdmin = () => requireAdminRole(ORDER_ROLES);
export const requireOwner = () => requireAdminRole(["OWNER"]);

export function canChangePrices(session: AdminSession): boolean {
  return session.role === "OWNER" || session.role === "MANAGER";
}
