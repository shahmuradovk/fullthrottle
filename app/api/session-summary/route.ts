import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cartCount } from "@/lib/cart";

// The one cookie-reading call the storefront header makes. Keeping this out
// of the layout lets catalog pages render from the CDN cache while the
// cart badge and account name stay live.
export const dynamic = "force-dynamic";

export async function GET() {
  const [session, count] = await Promise.all([auth(), cartCount()]);
  return NextResponse.json(
    {
      name: session?.user?.name ?? null,
      cartCount: count,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
