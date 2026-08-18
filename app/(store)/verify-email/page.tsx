import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let outcome: "verified" | "invalid" = "invalid";
  if (token) {
    const record = await prisma.verificationToken.findUnique({ where: { token } });
    if (record && record.expires > new Date()) {
      await prisma.user.updateMany({
        where: { email: record.identifier, emailVerified: null },
        data: { emailVerified: new Date() },
      });
      await prisma.verificationToken.delete({ where: { token } });
      outcome = "verified";
    }
  }

  return (
    <main className="flex justify-center px-5 py-16">
      <div className="flex w-[440px] max-w-full flex-col gap-4 rounded-1 border border-line bg-surface p-8 text-center">
        {outcome === "verified" ? (
          <>
            <h1 className="font-display text-[28px] font-bold text-ink">EMAIL CONFIRMED</h1>
            <p className="text-sm text-ink-secondary">
              Order updates will reach this address from now on.
            </p>
            <Button asChildHref="/account">Go to your account</Button>
          </>
        ) : (
          <>
            <h1 className="font-display text-[28px] font-bold text-ink">
              LINK EXPIRED OR ALREADY USED
            </h1>
            <p className="text-sm text-ink-secondary">
              Request a fresh confirmation link from your profile page.
            </p>
            <Button variant="secondary" asChildHref="/account/profile">
              Open profile
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
