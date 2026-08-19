import { getSections } from "@/lib/catalog";
import { buildSafe } from "@/lib/build-safe";
import { StoreHeader } from "@/components/store/header";
import { StoreFooter } from "@/components/store/footer";

// No cookies are read here on purpose: catalog pages stay CDN-cacheable and
// the header's account/cart links hydrate from /api/session-summary instead.
export const revalidate = 300;

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sections = await buildSafe(() => getSections(), []);
  return (
    <div className="flex min-h-screen flex-col">
      <StoreHeader sections={sections} />
      <div className="flex-1">{children}</div>
      <StoreFooter />
    </div>
  );
}
