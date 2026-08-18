"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hash as argonHash } from "@node-rs/argon2";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/admin/guard";
import { writeAudit } from "@/lib/audit";
import { AdminRole } from "@prisma/client";

export type InviteState = { error: string } | { created: string } | null;

// Admin accounts are invite-only — there is no public admin registration
// route (engineering brief §5).
export async function inviteAdminAction(
  _prev: InviteState,
  formData: FormData
): Promise<InviteState> {
  const session = await requireOwner();
  const parsed = z
    .object({
      email: z.string().email("Enter a valid email address."),
      role: z.nativeEnum(AdminRole),
      password: z.string().min(12, "Use at least 12 characters for the starting password."),
    })
    .safeParse({
      email: formData.get("email"),
      role: formData.get("role"),
      password: formData.get("password"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const email = parsed.data.email.toLowerCase();
  const exists = await prisma.adminUser.findUnique({ where: { email } });
  if (exists) return { error: "That email already has an admin account." };

  const admin = await prisma.adminUser.create({
    data: {
      email,
      role: parsed.data.role,
      passwordHash: await argonHash(parsed.data.password),
    },
  });
  await writeAudit({
    actorId: session.adminId,
    action: "admin.invite",
    entity: "AdminUser",
    entityId: admin.id,
    after: { email: admin.email, role: admin.role },
  });
  revalidatePath("/admin/users");
  return {
    created: `${email} can now sign in with the starting password. Two-factor setup runs on their first login.`,
  };
}
