import Link from "next/link";

// Placeholder landing — the real home screen ships in Phase 2 (catalog).
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="type-label text-accent">Ships from our US warehouse</p>
      <h1 className="font-display text-[64px] font-bold leading-none text-ink">
        FULLTHROTTLE
      </h1>
      <p className="max-w-md text-ink-secondary">
        Parts with the spec sheet attached. The storefront arrives in Phase 2 — the
        design system is already on the bench.
      </p>
      <Link href="/gallery" className="font-mono text-sm">
        View the component sheet →
      </Link>
    </main>
  );
}
