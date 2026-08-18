import { AccountNav } from "./account-nav";

export const dynamic = "force-dynamic";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-[1200px] px-5 py-10 md:px-10">
      <h1 className="mb-6 font-display text-[40px] font-bold text-ink">YOUR ACCOUNT</h1>
      <div className="grid items-start gap-8 md:grid-cols-[200px_1fr]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
