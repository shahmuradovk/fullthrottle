import { redirect } from "next/navigation";
import { auth, oauthProviders } from "@/auth";
import { AuthCard } from "./auth-card";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; callbackUrl?: string }>;
}) {
  const session = await auth();
  const { mode, callbackUrl } = await searchParams;
  const safeCallback =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/account";
  if (session?.user) redirect(safeCallback);

  return (
    <main className="flex justify-center px-5 py-16">
      <AuthCard
        mode={mode === "signin" ? "signin" : "register"}
        callbackUrl={safeCallback}
        providers={oauthProviders}
      />
    </main>
  );
}
