import { and, asc, count, desc, eq } from "drizzle-orm";
import { db, schema } from "../db/client";
import { listGames } from "./games";
import { listProjects } from "./projects";

const PROP_BY_GROUP = { finance: "/assets/konjed/rewards/coin.png", soft: "/assets/konjed/rewards/crystal.png", entrepreneurship: "/assets/konjed/rewards/idea-bulb.png" } as const;
const PROP_BY_KIND = { individual: "/assets/konjed/rewards/coin.png", group: "/assets/konjed/rewards/backpack.png", learning_experience: "/assets/konjed/rewards/book.png", idea: "/assets/konjed/rewards/idea-bulb.png" } as const;
const HUE = { individual: "#FFB400", group: "#5EE6A8", learning_experience: "#4CC2FF", idea: "#B58CFF" } as const;

/** Live data behind the home page scenes (so admin edits show up without a deploy). */
export async function homeData() {
  const all = await listGames({ sort: "recommended", limit: 12 });
  const picked = [...all.filter((g) => g.featured), ...all.filter((g) => !g.featured)].slice(0, 3);
  const games = picked.map((g, i) => ({ ...g, index: (i + 1).toLocaleString("fa-IR").padStart(2, "۰"), prop: PROP_BY_GROUP[g.skillGroup] }));
  const projs = await listProjects({ sort: "popular", limit: 5 });
  const projects = projs.map((p) => ({ id: p.id, title: p.title, maker: p.author, tag: p.skill ?? p.kindLabel, blurb: p.description.slice(0, 110), prop: PROP_BY_KIND[p.kind], hue: HUE[p.kind] }));
  const [c] = await db.select({ c: schema.courses, n: count(schema.enrollments.studentId) }).from(schema.courses).leftJoin(schema.enrollments, eq(schema.enrollments.courseId, schema.courses.id))
    .where(and(eq(schema.courses.featured, true), eq(schema.courses.status, "registering"))).groupBy(schema.courses.id).orderBy(asc(schema.courses.createdAt)).limit(1);
  const course = c ? { title: c.c.title, skills: c.c.skills, age: `${c.c.ageMin.toLocaleString("fa-IR")} تا ${c.c.ageMax.toLocaleString("fa-IR")} سال`, status: "ثبت‌نام فعال", href: "/courses#registering" } : null;
  return { games, projects, course };
}
void desc;
