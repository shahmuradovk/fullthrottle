import type { MetadataRoute } from "next";

// Note: /admin is deliberately NOT mentioned here — disallowing it would
// advertise its existence (brief §5: no link from any public page, sitemap
// or robots.txt).
export default function robots(): MetadataRoute.Robots {
  const base = (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/cart", "/checkout", "/account", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
