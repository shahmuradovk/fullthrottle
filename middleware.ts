import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/admin/session";

// Two jobs, both edge-safe (JWT + headers only, no database):
//   1. Admin realm guard — role enforcement happens again inside every action.
//   2. Strict CSP with per-request nonces + strict-dynamic (SAQ A, brief §10).

const PUBLIC_ADMIN_PATHS = ["/admin/sign-in"];
const PENDING_ADMIN_PATHS = ["/admin/verify-totp", "/admin/setup-totp"];

// Third-party script inventory (brief §10) — every entry needs a reason:
//   js.stripe.com — Stripe.js + Payment Element iframe (card fields, SAQ A)
// No tag manager anywhere, least of all on checkout.
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    // strict-dynamic: only our nonced scripts, plus what they load (Stripe.js).
    // No unsafe-inline, no wildcard script sources (brief §10).
    `script-src 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://*.stripe.com",
    "font-src 'self' data:",
    "connect-src 'self' https://api.stripe.com https://js.stripe.com https://*.paypal.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com https://*.paypal.com",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function withSecurityHeaders(
  request: NextRequest,
  pathname: string
): { requestHeaders: Headers; apply: (res: NextResponse) => NextResponse } {
  const requestHeaders = new Headers(request.headers);
  let csp: string | null = null;

  // CSP applies to rendered pages in production; webhooks/API stay bare.
  if (process.env.NODE_ENV === "production" && !pathname.startsWith("/api/")) {
    const nonce = btoa(crypto.getRandomValues(new Uint8Array(16)).join("-")).slice(0, 24);
    csp = buildCsp(nonce);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("content-security-policy", csp);
  }

  const apply = (res: NextResponse) => {
    if (csp) res.headers.set("content-security-policy", csp);
    return res;
  };
  return { requestHeaders, apply };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { requestHeaders, apply } = withSecurityHeaders(request, pathname);

  // Optional hard subdomain split: when ADMIN_HOSTNAME is configured, the
  // admin realm only exists on that host and never on the public host.
  const next = () => apply(NextResponse.next({ request: { headers: requestHeaders } }));
  const redirect = (to: string) =>
    apply(NextResponse.redirect(new URL(to, request.url)));

  const adminHost = process.env.ADMIN_HOSTNAME;
  if (adminHost) {
    const host = request.headers.get("host")?.split(":")[0];
    const isAdminHost = host === adminHost;
    const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
    if (isAdminPath && !isAdminHost) {
      return new NextResponse(null, { status: 404 });
    }
    if (isAdminHost && !isAdminPath && !pathname.startsWith("/_next")) {
      return redirect("/admin");
    }
  }

  if (!(pathname === "/admin" || pathname.startsWith("/admin/"))) {
    return next();
  }

  if (PUBLIC_ADMIN_PATHS.includes(pathname)) return next();

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const session = token ? await verifyAdminToken(token) : null;

  if (!session) {
    return redirect("/admin/sign-in");
  }

  if (session.stage !== "full") {
    const target =
      session.stage === "enroll-pending" ? "/admin/setup-totp" : "/admin/verify-totp";
    if (!PENDING_ADMIN_PATHS.includes(pathname)) {
      return redirect(target);
    }
    return next();
  }

  // Fully signed in — keep the pending pages unreachable.
  if (PENDING_ADMIN_PATHS.includes(pathname)) {
    return redirect("/admin");
  }

  return next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
