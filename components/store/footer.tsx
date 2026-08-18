export function StoreFooter() {
  return (
    <footer className="mt-auto flex flex-wrap items-center gap-3 border-t border-line bg-surface px-5 py-5 md:px-10">
      <span className="type-label text-ink-secondary">US shipping only</span>
      <span aria-hidden className="text-ink-secondary">
        ·
      </span>
      <span className="type-label text-ink-secondary">Reno, NV</span>
      <span aria-hidden className="text-ink-secondary">
        ·
      </span>
      <span className="type-label text-ink-secondary">
        30-day returns on unfitted parts
      </span>
    </footer>
  );
}
