import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCatalogAdmin } from "@/lib/admin/guard";
import { cn } from "@/lib/cn";
import { AttributesManager, type AttributeRow } from "./attributes-manager";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function AdminAttributesPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  await requireCatalogAdmin();
  const { section: sectionParam } = await searchParams;
  const sections = await prisma.section.findMany({ orderBy: { position: "asc" } });
  const active = sections.find((s) => s.id === sectionParam) ?? sections[0];

  if (!active) {
    return (
      <EmptyState
        title="No sections yet"
        body="Create a section first — its attribute template lives here."
      />
    );
  }

  const attributes = await prisma.attribute.findMany({
    where: { sectionId: active.id },
    orderBy: { position: "asc" },
  });

  const rows: AttributeRow[] = attributes.map((a) => ({
    id: a.id,
    key: a.key,
    name: a.name,
    type: a.type,
    options: a.options,
    unit: a.unit ?? "",
    filterable: a.filterable,
    position: a.position,
  }));

  return (
    <div>
      <p className="mb-1.5 font-mono text-[11px] text-ink-secondary">
        Attributes / {active.name}
      </p>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[28px] font-bold uppercase text-ink">
          {active.name} — Attribute template
        </h1>
        <div className="flex gap-2">
          {sections.map((s) => (
            <Link
              key={s.id}
              href={`/admin/attributes?section=${s.id}`}
              className={cn(
                "rounded-pill border px-3 py-1.5 font-mono text-xs !no-underline",
                s.id === active.id
                  ? "border-accent bg-accent !text-accent-ink"
                  : "border-line !text-ink hover:border-ink"
              )}
            >
              {s.name}
            </Link>
          ))}
        </div>
      </div>
      <AttributesManager sectionId={active.id} attributes={rows} />
    </div>
  );
}
