import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSections } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sections = await getSections();
  const counts = await prisma.product.groupBy({
    by: ["sectionId"],
    where: { active: true },
    _count: { _all: true },
  });
  const countBySection = Object.fromEntries(
    counts.map((c) => [c.sectionId, c._count._all])
  );

  return (
    <main>
      <section className="grid items-center gap-10 border-b border-line px-5 py-12 md:px-10 lg:grid-cols-[1fr_520px] lg:gap-14 lg:py-16">
        <div>
          <p className="type-label mb-4 text-accent">Fiche FT-00 · Start here</p>
          <h1 className="font-display text-[44px] font-bold leading-none text-ink md:text-[64px]">
            PARTS WITH THE
            <br />
            SPEC SHEET ATTACHED.
          </h1>
          <p className="mt-3 mb-7 max-w-[520px] text-base text-ink-secondary">
            Every part on this site carries the numbers you actually need — material,
            weight, certification, stock state and ship date. Filter on them, then
            order.
          </p>
          <div className="flex flex-wrap gap-3">
            {sections.map((s, i) => (
              <Button key={s.id} variant={i === 0 ? "primary" : "secondary"} asChildHref={`/${s.slug}`}>
                Browse {s.name}
              </Button>
            ))}
          </div>
        </div>
        <div className="img-placeholder relative flex h-[280px] items-center justify-center rounded-1 border border-line lg:h-[360px]">
          <Callout n={1} className="absolute left-4 top-4 bg-surface" />
          <span className="text-center font-mono text-xs text-ink-secondary">
            exploded parts diagram —
            <br />
            hero artwork, no lifestyle photo
          </span>
        </div>
      </section>

      <section className="px-5 py-12 md:px-10">
        <div className="mb-6 flex items-baseline justify-between border-b-[1.5px] border-ink pb-2.5">
          <h2 className="font-display text-[28px] font-bold text-ink">SECTIONS</h2>
          <span className="type-label hidden text-ink-secondary sm:block">
            Rendered from catalog — admin adds more
          </span>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => (
            <Link
              key={s.id}
              href={`/${s.slug}`}
              className="block overflow-hidden rounded-1 border border-line bg-surface !text-ink !no-underline transition-[border-color] duration-(--dur-fast) hover:border-ink"
            >
              <div className="img-placeholder flex h-40 items-center justify-center">
                <span className="font-mono text-[11px] text-ink-secondary">
                  section photo
                </span>
              </div>
              <div className="flex flex-col gap-1 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-2xl font-semibold uppercase">
                    {s.name}
                  </span>
                  <span className="font-mono text-xs uppercase text-ink-secondary">
                    {countBySection[s.id] ?? 0} products
                  </span>
                </div>
                {s.tagline && (
                  <span className="text-sm text-ink-secondary">{s.tagline}</span>
                )}
              </div>
            </Link>
          ))}
          <div className="flex min-h-40 flex-col items-center justify-center gap-1.5 rounded-1 border border-dashed border-line p-4 text-center">
            <span className="type-label text-ink-secondary">
              Gloves · Brake pads · Tires
            </span>
            <span className="text-sm text-ink-secondary">
              Next sections land here — nothing to configure.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
