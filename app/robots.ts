import type { MetadataRoute } from "next";
const base = process.env.SITE_URL ?? "http://localhost:3000";
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/panel", "/api", "/login", "/signup"] }], sitemap: `${base}/sitemap.xml` };
}
