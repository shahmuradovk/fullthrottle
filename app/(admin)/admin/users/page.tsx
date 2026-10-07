import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/admin/guard";
import { InviteAdminForm } from "./invite-form";
import { setTotpRequiredAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireOwner();
  const admins = await prisma.adminUser.findMany({ orderBy: { email: "asc" } });

  return (
    <div>
      <h1 className="mb-4 font-display text-[28px] font-bold text-ink">ADMIN USERS</h1>
      <div className="mb-4 rounded-1 border border-line bg-surface">
        <div className="grid grid-cols-[1fr_110px_210px_150px] gap-2.5 border-b-[1.5px] border-ink px-4 py-2.5 max-md:hidden">
          {["Email", "Role", "Two-factor", "Last sign-in"].map((h) => (
            <span key={h} className="type-label text-ink-secondary">
              {h}
            </span>
          ))}
        </div>
        {admins.map((a) => (
          <div
            key={a.id}
            className="grid grid-cols-[1fr_110px_210px_150px] items-center gap-2.5 border-b border-line px-4 py-2.5 max-md:grid-cols-2"
          >
            <span className="font-mono text-xs text-ink">{a.email}</span>
            <span className="font-mono text-[11px] uppercase text-ink-secondary">
              {a.role}
            </span>
            <span className="flex items-center gap-3">
              <span
                className={`font-mono text-[11px] uppercase ${
                  !a.totpRequired
                    ? "text-ink-secondary"
                    : a.totpEnabled
                      ? "text-stock-in"
                      : "text-stock-low"
                }`}
              >
                {!a.totpRequired ? "Off" : a.totpEnabled ? "On" : "Pending setup"}
              </span>
              <form action={setTotpRequiredAction}>
                <input type="hidden" name="adminId" value={a.id} />
                <input type="hidden" name="required" value={a.totpRequired ? "false" : "true"} />
                <button
                  type="submit"
                  className="cursor-pointer border-none bg-transparent p-0 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-secondary underline underline-offset-[3px] hover:text-ink"
                >
                  {a.totpRequired ? "Turn off" : "Require"}
                </button>
              </form>
            </span>
            <span className="font-mono text-[11px] text-ink-secondary">
              {a.lastLoginAt
                ? a.lastLoginAt.toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "Never"}
            </span>
          </div>
        ))}
      </div>
      <InviteAdminForm />
    </div>
  );
}
