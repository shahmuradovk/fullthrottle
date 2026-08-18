// Apple Pay domain verification (engineering brief §2): must resolve at
// /.well-known/apple-developer-merchantid-domain-association as text/plain.
// Stripe supplies the file content — store it in the env var below.

export function GET() {
  const body = process.env.APPLE_PAY_DOMAIN_ASSOCIATION;
  if (!body) {
    return new Response(
      "Apple Pay domain association not configured. Set APPLE_PAY_DOMAIN_ASSOCIATION to the file content from Stripe.",
      { status: 404, headers: { "content-type": "text/plain" } }
    );
  }
  return new Response(body, { headers: { "content-type": "text/plain" } });
}
