// The site's own absolute URL, for links in emails, feeds and PayPal
// round-trips. On Netlify the URL env var is set automatically.
export function appUrl(): string {
  return (
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
