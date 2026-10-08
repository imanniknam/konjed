import type { PageData } from "./types";
import { ALL_GAMES, GAMES_BY_SKILL, GAMES_POPULAR, GAMES_PUBLISH } from "./games";
import { COURSES } from "./school";
import { ACHIEVEMENTS, CHALLENGES, GALLERY } from "./showcase";
import { CONTACT, METHOD, PARTNERSHIP, STORY } from "./about";

const PAGES: PageData[] = [ALL_GAMES, GAMES_BY_SKILL, GAMES_POPULAR, GAMES_PUBLISH, COURSES, GALLERY, ACHIEVEMENTS, CHALLENGES, STORY, METHOD, PARTNERSHIP, CONTACT];
const ALIASES: Record<string, string> = { showcase: "showcase/gallery", about: "about/story" };

export const PAGE_SLUGS = PAGES.map((p) => p.slug);
export function findPage(slug: string[]): PageData | undefined {
  const key = slug.join("/");
  const real = ALIASES[key] ?? key;
  return PAGES.find((p) => p.slug === real);
}

/** Code default of a page (the CMS may override it; see lib/server/cms.ts). */
export function defaultPage(slug: string): PageData | undefined {
  const real = ALIASES[slug] ?? slug;
  return PAGES.find((p) => p.slug === real);
}
