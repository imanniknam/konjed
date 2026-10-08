import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/client";
import { ApiError, forbidden } from "../http/errors";
import { linkChildSchema } from "../validation";
import { notify } from "./common";
import { achievementSummary, badgeProgress } from "./gamification";
import { myCourses } from "./courses";
import { myProjects } from "./projects";
import { recentSubmissions } from "./missions";

export async function linkChild(parentId: string, input: z.infer<typeof linkChildSchema>) {
  const [p] = await db.select({ userId: schema.studentProfiles.userId, name: schema.users.displayName }).from(schema.studentProfiles).innerJoin(schema.users, eq(schema.users.id, schema.studentProfiles.userId)).where(eq(schema.studentProfiles.linkCode, input.code));
  if (!p) throw new ApiError(404, "bad_code", "این کد پیدا نشد؛ از فرزندت بخواه کد رو از «پروفایل و تنظیمات» بخونه.");
  const ins = await db.insert(schema.parentLinks).values({ parentId, studentId: p.userId }).onConflictDoNothing().returning();
  if (!ins.length) throw new ApiError(409, "already", "این فرزند قبلاً به حساب شما وصل شده.");
  await notify(p.userId, "parent", "یکی از والدین به حسابت وصل شد", undefined, "/panel/student/settings");
  return { studentId: p.userId, name: p.name };
}

export async function children(parentId: string) {
  return db.select({ id: schema.users.id, name: schema.users.displayName, level: schema.studentProfiles.level, points: schema.studentProfiles.points })
    .from(schema.parentLinks).innerJoin(schema.users, eq(schema.users.id, schema.parentLinks.studentId)).innerJoin(schema.studentProfiles, eq(schema.studentProfiles.userId, schema.users.id)).where(eq(schema.parentLinks.parentId, parentId));
}

export async function assertChild(parentId: string, studentId: string) {
  const [l] = await db.select().from(schema.parentLinks).where(and(eq(schema.parentLinks.parentId, parentId), eq(schema.parentLinks.studentId, studentId)));
  if (!l) throw forbidden();
}

export async function childSkills(studentId: string) {
  const rows = await db.select({ skill: schema.skillEvents.skill, avg: sql<number>`round(avg(${schema.skillEvents.score}))`, n: sql<number>`count(*)`, last: sql<Date>`max(${schema.skillEvents.createdAt})` }).from(schema.skillEvents).where(eq(schema.skillEvents.userId, studentId)).groupBy(schema.skillEvents.skill);
  const trend = await db.select({ month: sql<string>`to_char(${schema.skillEvents.createdAt}, 'YYYY-MM')`, avg: sql<number>`round(avg(${schema.skillEvents.score}))` }).from(schema.skillEvents).where(eq(schema.skillEvents.userId, studentId)).groupBy(sql`to_char(${schema.skillEvents.createdAt}, 'YYYY-MM')`).orderBy(sql`1`);
  const skills = rows.map((r) => ({ skill: r.skill, score: Number(r.avg), attempts: Number(r.n) })).sort((a, b) => b.score - a.score);
  return { skills, strengths: skills.filter((s) => s.score >= 75).slice(0, 3), needsPractice: [...skills].reverse().filter((s) => s.score < 70).slice(0, 3), trend: trend.map((t) => ({ month: t.month, score: Number(t.avg) })) };
}

export async function childDashboard(parentId: string, studentId: string) {
  await assertChild(parentId, studentId);
  const [u] = await db.select({ name: schema.users.displayName }).from(schema.users).where(eq(schema.users.id, studentId));
  const [summary, courses, skills, projects, recent] = await Promise.all([achievementSummary(studentId), myCourses(studentId), childSkills(studentId), myProjects(studentId), recentSubmissions(studentId, 5)]);
  return { name: u?.name, summary, activeCourses: courses, activeSkills: skills.skills.map((s) => s.skill), recentProjects: projects.slice(0, 4), recentMissions: recent };
}

export async function childAchievements(parentId: string, studentId: string) {
  await assertChild(parentId, studentId);
  const [badges, projects, challenges] = await Promise.all([badgeProgress(studentId), myProjects(studentId), db.select({ title: schema.challenges.title, at: schema.challengeEntries.createdAt }).from(schema.challengeEntries).innerJoin(schema.challenges, eq(schema.challenges.id, schema.challengeEntries.challengeId)).where(eq(schema.challengeEntries.userId, studentId))]);
  return { badges: badges.filter((b) => b.earned), projects, challenges, summary: await achievementSummary(studentId) };
}

export async function childReport(parentId: string, studentId: string, days = 30) {
  await assertChild(parentId, studentId);
  const since = new Date(Date.now() - days * 864e5);
  const [subs] = await db.select({ n: sql<number>`count(*)`, avg: sql<number>`coalesce(round(avg(coalesce(${schema.missionSubmissions.coachScore}, ${schema.missionSubmissions.aiScore}))), 0)` }).from(schema.missionSubmissions).where(and(eq(schema.missionSubmissions.studentId, studentId), gte(schema.missionSubmissions.createdAt, since)));
  const [pts] = await db.select({ n: sql<number>`coalesce(sum(${schema.pointsLedger.amount}),0)` }).from(schema.pointsLedger).where(and(eq(schema.pointsLedger.userId, studentId), eq(schema.pointsLedger.kind, "points"), gte(schema.pointsLedger.createdAt, since)));
  const [att] = await db.select({ all: sql<number>`count(*)`, present: sql<number>`count(*) filter (where ${schema.attendanceRecords.status} <> 'absent')` }).from(schema.attendanceRecords).where(eq(schema.attendanceRecords.studentId, studentId));
  const newBadges = await db.select({ title: schema.badges.title, at: schema.userBadges.awardedAt }).from(schema.userBadges).innerJoin(schema.badges, eq(schema.badges.id, schema.userBadges.badgeId)).where(and(eq(schema.userBadges.userId, studentId), gte(schema.userBadges.awardedAt, since))).orderBy(desc(schema.userBadges.awardedAt));
  const skills = await childSkills(studentId);
  return { days, completedMissions: Number(subs.n), avgScore: Number(subs.avg), pointsEarned: Number(pts.n), participation: Number(att.all) ? Math.round((Number(att.present) / Number(att.all)) * 100) : null, newBadges, strengthened: skills.skills.slice(0, 4), skills };
}
