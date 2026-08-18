import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function requireUser(callbackUrl: string) {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) {
    redirect(`/sign-in?mode=signin&callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    redirect(`/sign-in?mode=signin&callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return user;
}
