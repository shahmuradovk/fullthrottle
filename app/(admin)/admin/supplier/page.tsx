import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/guard";
import { SUPPLIER_SYNC_ENABLED } from "@/lib/supplier/adapter";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

// The screen ships in its disabled state (engineering brief §9). When the
// supplier documentation arrives, only the adapter gets written.
export default async function AdminSupplierPage() {
  await requireAdmin();
  const supplier = await prisma.supplier.findFirst({
    include: { syncRuns: { orderBy: { startedAt: "desc" }, take: 5 } },
  });

  const rows: [string, string][] = [
    ["Flag", `SUPPLIER_SYNC_ENABLED = ${String(SUPPLIER_SYNC_ENABLED)}`],
    ["Supplier", supplier?.name ?? "—"],
    ["API endpoint", supplier?.apiBaseUrl ?? "—"],
    ["API key", supplier?.credentialRef ? `ref: ${supplier.credentialRef}` : "—"],
    ["Sync interval", `${supplier?.syncMinutes ?? 30} min`],
  ];

  return (
    <div>
      <h1 className="mb-4 font-display text-[28px] font-bold text-ink">SUPPLIER</h1>
      <div className="max-w-[720px] rounded-1 border border-line bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-display text-[22px] font-semibold text-ink">
                SUPPLIER STOCK SYNC
              </h2>
              <span className="rounded-1 border border-dashed border-ink-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-secondary">
                Not connected
              </span>
            </div>
            <p className="mt-2.5 max-w-[440px] text-sm leading-relaxed text-ink-secondary">
              When connected, supplier feeds set the four stock states and the 2–4 day
              ship window automatically, every 30 minutes. Until then, every product
              runs from the manual source — stock is whatever you enter on the product
              form.
            </p>
          </div>
          <Button disabled size="small">
            Connect supplier
          </Button>
        </div>
        <dl className="mt-5 flex flex-col gap-2.5 border-t border-line pt-4">
          {rows.map(([k, v]) => (
            <div key={k} className="flex gap-3 text-sm">
              <dt className="type-label w-[110px] shrink-0 text-ink-secondary">{k}</dt>
              <dd
                className={`m-0 font-mono text-xs ${k === "Flag" ? "text-stock-low" : "text-ink"}`}
              >
                {v}
              </dd>
            </div>
          ))}
          <p className="mt-1.5 text-[13px] text-ink-secondary">
            When the supplier documentation arrives, only the adapter gets written —
            product, cart, and checkout screens stay untouched.
          </p>
        </dl>
      </div>
    </div>
  );
}
