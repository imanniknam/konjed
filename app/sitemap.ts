import type { MetadataRoute } from "next";
import { PAGE_SLUGS } from "@/lib/konjed/pages/registry";
import { listGames } from "@/lib/server/services/games";

export const dynamic = "force-dynamic";
const base = process.env.SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const games = await listGames({ sort: "newest", limit: 60 }).catch(() => []);
  return [
    { url: base, priority: 1 },
    ...PAGE_SLUGS.map((s) => ({ url: `${base}/${s}`, priority: 0.7 })),
    ...games.map((g) => ({ url: `${base}/games/${g.slug}`, lastModified: g.publishedAt, priority: 0.6 })),
  ];
}
