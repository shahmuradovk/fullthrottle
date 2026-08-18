import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/customer";
import { ProfileForms } from "./profile-forms";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");
  const accounts = await prisma.account.findMany({ where: { userId: user.id } });
  const provider =
    accounts.length > 0
      ? accounts
          .map((a) => a.provider.charAt(0).toUpperCase() + a.provider.slice(1))
          .join(" + ")
      : "email";

  return (
    <ProfileForms
      name={user.name}
      email={user.email}
      contactEmail={user.contactEmail ?? ""}
      emailVerified={Boolean(user.emailVerified)}
      hasPassword={Boolean(user.passwordHash)}
      provider={provider}
    />
  );
}
