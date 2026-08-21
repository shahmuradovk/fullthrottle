import { prisma } from "@/lib/db";

// Serves product photos stored in the database. Image rows are immutable —
// replacing a product's photo creates a new row (new URL) — so the CDN may
// cache these forever.

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const image = await prisma.productImage.findUnique({
    where: { id },
    select: { data: true, contentType: true },
  });
  if (!image?.data) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(Buffer.from(image.data), {
    headers: {
      "content-type": image.contentType ?? "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
      "netlify-cdn-cache-control": "public, durable, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
