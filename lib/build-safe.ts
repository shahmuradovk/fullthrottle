// Tolerate a missing database ONLY while `next build` prerenders (CI has no
// database; Netlify builds do). At runtime a failure must surface as an error
// page — never as an empty page frozen into the ISR cache.
export async function buildSafe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  }
  return fn();
}
