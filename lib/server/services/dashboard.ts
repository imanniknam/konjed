import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "../db/client";
import { achievementSummary, badgeProgress, rankings, recentLedger } from "./gamification";
import { myCourses } from "./courses";
import { nextMission, missionMap, recentSubmissions } from "./missions";
import { GAMES_SUGGEST } from "./suggest";

export async function studentDashboard(userId: string) {
  const [u] = await db.select({ name: schema.users.displayName, avatar: schema.users.avatar }).from(schema.users).where(eq(schema.users.id, userId));
  const [prof] = await db.select().from(schema.studentProfiles).where(eq(schema.studentProfiles.userId, userId));
  const [summary, next, courses, ledger, badges, recent, rank, map] = await Promise.all([achievementSummary(userId), nextMission(userId), myCourses(userId), recentLedger(userId, 5), badgeProgress(userId), recentSubmissions(userId, 3), rankings(userId), missionMap(userId)]);
  const lastBadge = badges.filter((b) => b.earned).sort((a, b) => +new Date(b.awardedAt!) - +new Date(a.awardedAt!))[0] ?? null;
  const resume = map.find((p) => p.done > 0 && p.done < p.total) ?? map[0] ?? null;
  const [plays] = await db.select({ n: count() }).from(schema.gamePlays).where(eq(schema.gamePlays.userId, userId));
  const [parents] = await db.select({ n: count() }).from(schema.parentLinks).where(eq(schema.parentLinks.studentId, userId));
  const onboarding = [
    { key: "course", label: "در یک دوره ثبت‌نام کن", done: courses.length > 0, href: "/courses#registering" },
    { key: "mission", label: "اولین مأموریتت رو انجام بده", done: summary.missions > 0, href: next ? `/panel/student/missions/${next.id}` : "/panel/student/missions" },
    { key: "game", label: "یک بازی در کنجد آرکید بازی کن", done: plays.n > 0, href: "/games" },
    { key: "project", label: "یک پروژه توی ویترین منتشر کن", done: summary.projects > 0, href: "/showcase/gallery#submit" },
    { key: "parent", label: "کد اتصال رو به والدینت بده", done: parents.n > 0, href: "/panel/student/settings" },
  ];
  return {
    onboarding, name: u?.name, avatar: u?.avatar, linkCode: prof?.linkCode, ...summary, rank: rank?.global ?? null, nextMission: next, courses,
    resume: resume ? { title: resume.title, done: resume.done, total: resume.total } : null, recentRewards: ledger, lastBadge, recentSubmissions: recent, suggestions: await GAMES_SUGGEST(userId),
  };
}

export async function notificationsFor(userId: string, limit = 30) {
  const rows = await db.select().from(schema.notifications).where(eq(schema.notifications.userId, userId)).orderBy(desc(schema.notifications.createdAt)).limit(limit);
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(schema.notifications).where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt)));
  return { items: rows, unread: Number(n) };
}
export async function markRead(userId: string, id?: string) {
  await db.update(schema.notifications).set({ readAt: new Date() }).where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt), id ? eq(schema.notifications.id, id) : undefined));
}
export const toolbox = () => db.select().from(schema.toolboxItems);
