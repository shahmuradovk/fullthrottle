import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/admin/session";

// Admin realm guard. Runs on the edge: JWT verification only — no database.
// Role enforcement happens again inside every admin server action.

const PUBLIC_ADMIN_PATHS = ["/admin/sign-in"];
const PENDING_ADMIN_PATHS = ["/admin/verify-totp", "/admin/setup-totp"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Optional hard subdomain split: when ADMIN_HOSTNAME is configured, the
  // admin realm only exists on that host and never on the public host.
  const adminHost = process.env.ADMIN_HOSTNAME;
  if (adminHost) {
    const host = request.headers.get("host")?.split(":")[0];
    const isAdminHost = host === adminHost;
    const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
    if (isAdminPath && !isAdminHost) {
      return new NextResponse(null, { status: 404 });
    }
    if (isAdminHost && !isAdminPath && !pathname.startsWith("/_next")) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  if (!(pathname === "/admin" || pathname.startsWith("/admin/"))) {
    return NextResponse.next();
  }

  if (PUBLIC_ADMIN_PATHS.includes(pathname)) return NextResponse.next();

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const session = token ? await verifyAdminToken(token) : null;

  if (!session) {
    return NextResponse.redirect(new URL("/admin/sign-in", request.url));
  }

  if (session.stage !== "full") {
    const target =
      session.stage === "enroll-pending" ? "/admin/setup-totp" : "/admin/verify-totp";
    if (!PENDING_ADMIN_PATHS.includes(pathname)) {
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.next();
  }

  // Fully signed in — keep the pending pages unreachable.
  if (PENDING_ADMIN_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
