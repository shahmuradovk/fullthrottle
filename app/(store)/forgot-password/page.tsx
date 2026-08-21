import { ForgotPasswordCard } from "./forgot-card";

export const dynamic = "force-dynamic";

export const metadata = { title: "Reset your password — Fullthrottle" };

export default function ForgotPasswordPage() {
  return (
    <main className="flex justify-center px-5 py-16">
      <ForgotPasswordCard />
    </main>
  );
}
