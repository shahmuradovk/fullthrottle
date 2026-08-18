import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

// Every admin mutation writes an AuditLog row (engineering brief §5).
export async function writeAudit(params: {
  actorId: string;
  action: string; // "product.update"
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      before: (params.before ?? undefined) as Prisma.InputJsonValue | undefined,
      after: (params.after ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
