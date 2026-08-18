import Link from "next/link";
import { cn } from "@/lib/cn";

function pageHref(basePath: string, params: URLSearchParams, page: number): string {
  const next = new URLSearchParams(params);
  if (page <= 1) next.delete("page");
  else next.set("page", String(page));
  const qs = next.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({
  basePath,
  searchParams,
  page,
  totalPages,
}: {
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val !== undefined) params.set(k, val);
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1.5">
      {pages.map((p) =>
        p === page ? (
          <span
            key={p}
            aria-current="page"
            className="inline-flex size-[34px] items-center justify-center rounded-1 bg-accent font-mono text-[13px] text-accent-ink"
          >
            {p}
          </span>
        ) : (
          <Link
            key={p}
            href={pageHref(basePath, params, p)}
            className={cn(
              "inline-flex size-[34px] items-center justify-center rounded-1 border border-line font-mono text-[13px] !text-ink !no-underline hover:border-ink"
            )}
          >
            {p}
          </Link>
        )
      )}
      {page < totalPages && (
        <Link
          href={pageHref(basePath, params, page + 1)}
          className="inline-flex h-[34px] items-center rounded-1 border border-line px-3 font-mono text-[13px] !text-ink !no-underline hover:border-ink"
        >
          Next
        </Link>
      )}
    </nav>
  );
}
