import { and, asc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/client";
import { ApiError, forbidden, notFound } from "../http/errors";
import { activateChallengeSchema, challengeEntrySchema } from "../validation";
import { notify } from "./common";
import { award } from "./gamification";

/** Challenge ids a student can enter right now because their coach switched them on for the student's class. */
async function classActivated(userId: string) {
  const now = new Date();
  const rows = await db.select({ c: schema.challengeClasses.challengeId }).from(schema.challengeClasses)
    .innerJoin(schema.enrollments, and(eq(schema.enrollments.classId, schema.challengeClasses.classId), eq(schema.enrollments.studentId, userId)))
    .where(and(or(isNull(schema.challengeClasses.startsAt), lte(schema.challengeClasses.startsAt, now)), or(isNull(schema.challengeClasses.endsAt), gte(schema.challengeClasses.endsAt, now))));
  return new Set(rows.map((r) => r.c));
}

export async function listChallenges(userId?: string | null) {
  const forClass = userId ? await classActivated(userId) : new Set<string>();
  const rows = await db.select().from(schema.challenges).orderBy(asc(schema.challenges.createdAt));
  const mine = userId ? new Set((await db.select({ c: schema.challengeEntries.challengeId }).from(schema.challengeEntries).where(eq(schema.challengeEntries.userId, userId))).map((x) => x.c)) : new Set<string>();
  const rem = userId ? new Set((await db.select({ c: schema.challengeReminders.challengeId }).from(schema.challengeReminders).where(eq(schema.challengeReminders.userId, userId))).map((x) => x.c)) : new Set<string>();
  return rows.map((c) => ({ id: c.id, slug: c.slug, title: c.title, description: c.description, skill: c.skill, kind: c.kind, deadlineLabel: c.deadlineLabel, status: c.status, available: c.status === "active" || forClass.has(c.id), points: c.points, entered: mine.has(c.id), reminder: rem.has(c.id) }));
}

export async function enterChallenge(userId: string, challengeId: string, input: z.infer<typeof challengeEntrySchema>) {
  const [c] = await db.select().from(schema.challenges).where(eq(schema.challenges.id, challengeId));
  if (!c) throw notFound("چالش");
  if (c.status !== "active" && !(await classActivated(userId)).has(c.id)) throw new ApiError(409, "inactive", "این چالش فعال نیست.");
  const ins = await db.insert(schema.challengeEntries).values({ challengeId, userId, text: input.text, projectId: input.projectId }).onConflictDoNothing().returning();
  if (!ins.length) throw new ApiError(409, "already", "قبلاً در این چالش شرکت کردی.");
  await award(userId, c.points, c.coins, `شرکت در چالش «${c.title}»`, { type: "challenge", id: c.id });
  await notify(userId, "challenge", "پاسخ چالشت ثبت شد", c.title, "/showcase/challenges");
  return { entered: true, points: c.points };
}

export async function toggleReminder(userId: string, challengeId: string) {
  const del = await db.delete(schema.challengeReminders).where(and(eq(schema.challengeReminders.challengeId, challengeId), eq(schema.challengeReminders.userId, userId))).returning();
  if (del.length) return { reminder: false };
  await db.insert(schema.challengeReminders).values({ challengeId, userId });
  return { reminder: true };
}

/** Coach turns a challenge on for one of their classes and notifies its students. */
export async function activateForClass(coachId: string, input: z.infer<typeof activateChallengeSchema>, isAdmin = false) {
  const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.id, input.classId));
  if (!cls || (cls.coachId !== coachId && !isAdmin)) throw forbidden();
  const [c] = await db.select().from(schema.challenges).where(eq(schema.challenges.id, input.challengeId));
  if (!c) throw notFound("چالش");
  await db.insert(schema.challengeClasses).values({ challengeId: c.id, classId: cls.id, startsAt: input.startsAt ? new Date(input.startsAt) : new Date(), endsAt: input.endsAt ? new Date(input.endsAt) : null })
    .onConflictDoUpdate({ target: [schema.challengeClasses.challengeId, schema.challengeClasses.classId], set: { startsAt: input.startsAt ? new Date(input.startsAt) : new Date(), endsAt: input.endsAt ? new Date(input.endsAt) : null } });
  const students = await db.select({ s: schema.enrollments.studentId }).from(schema.enrollments).where(eq(schema.enrollments.classId, cls.id));
  for (const s of students) await notify(s.s, "challenge", "یک چالش جدید برای کلاست فعال شد", c.title, "/showcase/challenges");
  return { activated: true, notified: students.length };
}

export async function classChallengeResults(classId: string) {
  return db.select({ challenge: schema.challenges.title, challengeId: schema.challenges.id, participants: sql<number>`count(${schema.challengeEntries.id})` })
    .from(schema.challengeClasses).innerJoin(schema.challenges, eq(schema.challenges.id, schema.challengeClasses.challengeId))
    .leftJoin(schema.challengeEntries, and(eq(schema.challengeEntries.challengeId, schema.challenges.id), sql`${schema.challengeEntries.userId} in (select student_id from enrollments where class_id = ${classId})`))
    .where(eq(schema.challengeClasses.classId, classId)).groupBy(schema.challenges.id);
}
