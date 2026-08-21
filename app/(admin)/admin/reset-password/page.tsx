import Link from "next/link";
import { AdminResetPasswordCard } from "./reset-card";

export default async function AdminResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return token ? (
    <AdminResetPasswordCard token={token} />
  ) : (
    <div className="flex w-[400px] max-w-full flex-col gap-4 rounded-1 border border-line bg-surface p-8">
      <h1 className="font-display text-[28px] font-bold text-ink">RESET PASSWORD</h1>
      <p className="text-[13px] leading-relaxed text-ink-secondary">
        This page only works from the link in a reset email.{" "}
        <Link href="/admin/forgot-password" className="text-ink underline underline-offset-[3px]">
          Request a reset link
        </Link>
        .
      </p>
    </div>
  );
}
