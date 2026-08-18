import { getSections } from "@/lib/catalog";
import { cartCount } from "@/lib/cart";
import { StoreHeader } from "@/components/store/header";
import { StoreFooter } from "@/components/store/footer";

export const dynamic = "force-dynamic";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sections, count] = await Promise.all([getSections(), cartCount()]);
  return (
    <div className="flex min-h-screen flex-col">
      <StoreHeader sections={sections} cartCount={count} />
      <div className="flex-1">{children}</div>
      <StoreFooter />
    </div>
  );
}
