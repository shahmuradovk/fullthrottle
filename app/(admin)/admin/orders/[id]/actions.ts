"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrdersAdmin } from "@/lib/admin/guard";
import { writeAudit } from "@/lib/audit";
import { transitionOrder, OrderTransitionError } from "@/lib/orders";
import { prisma } from "@/lib/db";
import { OrderStatus } from "@prisma/client";

export type TransitionState = { error: string } | null;

export async function advanceOrderAction(
  _prev: TransitionState,
  formData: FormData
): Promise<TransitionState> {
  const session = await requireOrdersAdmin();
  const parsed = z
    .object({
      orderId: z.string().min(1),
      next: z.nativeEnum(OrderStatus),
      carrier: z.string().trim().optional(),
      trackingNumber: z.string().trim().optional(),
    })
    .safeParse({
      orderId: formData.get("orderId"),
      next: formData.get("next"),
      carrier: formData.get("carrier") ?? undefined,
      trackingNumber: formData.get("trackingNumber") ?? undefined,
    });
  if (!parsed.success) return { error: "Something in the form didn't parse. Reload and retry." };

  const before = await prisma.order.findUnique({ where: { id: parsed.data.orderId } });
  if (!before) return { error: "Order not found." };

  try {
    await transitionOrder({
      orderId: parsed.data.orderId,
      next: parsed.data.next,
      actorId: session.adminId,
      carrier: parsed.data.carrier,
      trackingNumber: parsed.data.trackingNumber,
    });
  } catch (e) {
    if (e instanceof OrderTransitionError) return { error: e.message };
    throw e;
  }

  await writeAudit({
    actorId: session.adminId,
    action: "order.transition",
    entity: "Order",
    entityId: parsed.data.orderId,
    before: { status: before.status },
    after: {
      status: parsed.data.next,
      ...(parsed.data.next === "SHIPPED"
        ? { carrier: parsed.data.carrier, trackingNumber: parsed.data.trackingNumber }
        : {}),
    },
  });
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  revalidatePath("/admin/orders");
  return null;
}
