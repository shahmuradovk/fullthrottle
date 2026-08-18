import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/customer";
import { AddressBook, type AddressRow } from "./address-book";

export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { id: "asc" }],
  });

  const rows: AddressRow[] = addresses.map((a) => ({
    id: a.id,
    line1: a.line1,
    line2: a.line2 ?? "",
    city: a.city,
    state: a.state,
    zip: a.zip,
    phone: a.phone ?? "",
    isDefault: a.isDefault,
  }));

  return <AddressBook addresses={rows} />;
}
