import Link from "next/link";
import { ResetPasswordCard } from "./reset-card";

export const dynamic = "force-dynamic";

export const metadata = { title: "Choose a new password — Fullthrottle" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex justify-center px-5 py-16">
      {token ? (
        <ResetPasswordCard token={token} />
      ) : (
        <div className="flex w-[440px] max-w-full flex-col gap-4 rounded-1 border border-line bg-surface p-8">
          <h1 className="font-display text-[32px] font-bold text-ink">RESET PASSWORD</h1>
          <p className="text-sm leading-relaxed text-ink-secondary">
            This page only works from the link in a reset email.{" "}
            <Link href="/forgot-password" className="text-ink underline underline-offset-[3px]">
              Request a reset link
            </Link>
            .
          </p>
        </div>
      )}
    </main>
  );
}
