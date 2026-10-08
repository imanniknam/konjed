import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db, schema } from "../db/client";
import { notify } from "./common";

export const levelFor = (points: number) => 1 + Math.floor(points / 300);

/** Single entry point for rewarding a student: ledger + cached totals + level + badge check. */
export async function award(userId: string, points: number, coins: number, reason: string, ref?: { type: string; id: string }) {
  if (!points && !coins) return;
  await db.transaction(async (tx) => {
    if (points) await tx.insert(schema.pointsLedger).values({ userId, kind: "points", amount: points, reason, refType: ref?.type, refId: ref?.id });
    if (coins) await tx.insert(schema.pointsLedger).values({ userId, kind: "coins", amount: coins, reason, refType: ref?.type, refId: ref?.id });
    const [p] = await tx.update(schema.studentProfiles)
      .set({ points: sql`greatest(0, ${schema.studentProfiles.points} + ${points})`, coins: sql`greatest(0, ${schema.studentProfiles.coins} + ${coins})` })
      .where(eq(schema.studentProfiles.userId, userId)).returning({ points: schema.studentProfiles.points });
    if (p) await tx.update(schema.studentProfiles).set({ level: levelFor(p.points) }).where(eq(schema.studentProfiles.userId, userId));
  });
  await checkBadges(userId);
}

type Rule = { type: "missions_total" | "missions_in_skill" | "projects" | "projects_in_skill" | "group_projects" | "games_played" | "challenges"; count: number; skill?: string };

async function metric(userId: string, r: Rule): Promise<number> {
  switch (r.type) {
    case "missions_total": {
      const [x] = await db.select({ n: count() }).from(schema.missionSubmissions).where(eq(schema.missionSubmissions.studentId, userId)); return x.n;
    }
    case "missions_in_skill": {
      const [x] = await db.select({ n: count() }).from(schema.missionSubmissions).innerJoin(schema.missions, eq(schema.missions.id, schema.missionSubmissions.missionId))
        .where(and(eq(schema.missionSubmissions.studentId, userId), eq(schema.missions.skill, r.skill ?? ""))); return x.n;
    }
    case "projects": { const [x] = await db.select({ n: count() }).from(schema.projects).where(and(eq(schema.projects.authorId, userId), eq(schema.projects.status, "published"))); return x.n; }
    case "projects_in_skill": { const [x] = await db.select({ n: count() }).from(schema.projects).where(and(eq(schema.projects.authorId, userId), eq(schema.projects.skill, r.skill ?? ""))); return x.n; }
    case "group_projects": { const [x] = await db.select({ n: count() }).from(schema.projects).where(and(eq(schema.projects.authorId, userId), eq(schema.projects.kind, "group"))); return x.n; }
    case "games_played": { const [x] = await db.select({ n: sql<number>`count(distinct ${schema.gamePlays.gameId})` }).from(schema.gamePlays).where(eq(schema.gamePlays.userId, userId)); return Number(x.n); }
    case "challenges": { const [x] = await db.select({ n: count() }).from(schema.challengeEntries).where(eq(schema.challengeEntries.userId, userId)); return x.n; }
  }
}

/** Awards every badge whose declarative rule is now satisfied. */
export async function checkBadges(userId: string) {
  const all = await db.select().from(schema.badges);
  const have = new Set((await db.select({ b: schema.userBadges.badgeId }).from(schema.userBadges).where(eq(schema.userBadges.userId, userId))).map((x) => x.b));
  for (const b of all) {
    if (have.has(b.id)) continue;
    const rule = b.rule as Rule;
    if ((await metric(userId, rule)) >= rule.count) {
      const ins = await db.insert(schema.userBadges).values({ userId, badgeId: b.id }).onConflictDoNothing().returning();
      if (ins.length) await notify(userId, "badge", `نشان «${b.title}» رو گرفتی!`, b.description, "/panel/student/projects");
    }
  }
}

export async function badgeProgress(userId: string) {
  const all = await db.select().from(schema.badges);
  const mine = new Map((await db.select().from(schema.userBadges).where(eq(schema.userBadges.userId, userId))).map((x) => [x.badgeId, x.awardedAt]));
  return Promise.all(all.map(async (b) => {
    const rule = b.rule as Rule;
    const got = mine.get(b.id);
    return { code: b.code, title: b.title, description: b.description, icon: b.icon, earned: !!got, awardedAt: got ?? null, progress: got ? rule.count : Math.min(rule.count, await metric(userId, rule)), target: rule.count, skillGroup: b.skillGroup };
  }));
}

export async function achievementSummary(userId: string) {
  const [prof] = await db.select().from(schema.studentProfiles).where(eq(schema.studentProfiles.userId, userId));
  const [badges] = await db.select({ n: count() }).from(schema.userBadges).where(eq(schema.userBadges.userId, userId));
  const [missions] = await db.select({ n: count() }).from(schema.missionSubmissions).where(eq(schema.missionSubmissions.studentId, userId));
  const [projects] = await db.select({ n: count() }).from(schema.projects).where(and(eq(schema.projects.authorId, userId), eq(schema.projects.status, "published")));
  const [skills] = await db.select({ n: sql<number>`count(distinct ${schema.skillEvents.skill})` }).from(schema.skillEvents).where(eq(schema.skillEvents.userId, userId));
  return { points: prof?.points ?? 0, coins: prof?.coins ?? 0, level: prof?.level ?? 1, badges: badges.n, missions: missions.n, projects: projects.n, skills: Number(skills.n) };
}

export async function recentLedger(userId: string, limit = 8) {
  return db.select().from(schema.pointsLedger).where(eq(schema.pointsLedger.userId, userId)).orderBy(desc(schema.pointsLedger.createdAt)).limit(limit);
}

/** Rankings: position among class-mates, among the same age band, and the global top list. */
export async function rankings(userId: string) {
  const [me] = await db.select({ points: schema.studentProfiles.points, birthYear: schema.users.birthYear }).from(schema.studentProfiles).innerJoin(schema.users, eq(schema.users.id, schema.studentProfiles.userId)).where(eq(schema.studentProfiles.userId, userId));
  if (!me) return null;
  const rankIn = async (ids: string[] | null, ageBand?: [number, number]) => {
    const conds = [gte(schema.studentProfiles.points, me.points + 1)];
    const q = db.select({ n: count() }).from(schema.studentProfiles).innerJoin(schema.users, eq(schema.users.id, schema.studentProfiles.userId));
    let where = and(...conds);
    if (ids) where = and(where, ids.length ? inArray(schema.studentProfiles.userId, ids) : sql`false`);
    if (ageBand) where = and(where, sql`${schema.users.birthYear} between ${ageBand[0]} and ${ageBand[1]}`);
    const [x] = await q.where(where);
    return x.n + 1;
  };
  const year = new Date().getFullYear();
  const age = me.birthYear ? year - me.birthYear : 15;
  const band: [number, number] = age <= 14 ? [year - 14, year - 13] : [year - 17, year - 15];
  const myClassIds = (await db.select({ classId: schema.enrollments.classId }).from(schema.enrollments).where(eq(schema.enrollments.studentId, userId))).map((x) => x.classId).filter(Boolean) as string[];
  let classPeers: string[] | null = null;
  if (myClassIds.length) classPeers = (await db.select({ s: schema.enrollments.studentId }).from(schema.enrollments).where(inArray(schema.enrollments.classId, myClassIds))).map((x) => x.s);
  const top = await db.select({ id: schema.users.id, name: schema.users.displayName, points: schema.studentProfiles.points, level: schema.studentProfiles.level })
    .from(schema.studentProfiles).innerJoin(schema.users, eq(schema.users.id, schema.studentProfiles.userId)).orderBy(desc(schema.studentProfiles.points)).limit(10);
  return { points: me.points, global: await rankIn(null), inClass: classPeers ? await rankIn(classPeers) : null, inAge: await rankIn(null, band), top };
}
