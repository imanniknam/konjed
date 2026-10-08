import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { evaluate } from "../ai/evaluator";
import { db, schema } from "../db/client";
import { ApiError, forbidden, notFound } from "../http/errors";
import { missionSubmitSchema, reviewSchema } from "../validation";
import { notify } from "./common";
import { award } from "./gamification";

/** Missions visible to a student: those of enrolled courses plus course-less (global) ones. */
async function visibleMissions(studentId: string) {
  const courseIds = (await db.select({ c: schema.enrollments.courseId }).from(schema.enrollments).where(eq(schema.enrollments.studentId, studentId))).map((x) => x.c);
  const where = courseIds.length ? or(isNull(schema.missions.courseId), inArray(schema.missions.courseId, courseIds)) : isNull(schema.missions.courseId);
  return db.select({ m: schema.missions, course: schema.courses.title }).from(schema.missions).leftJoin(schema.courses, eq(schema.courses.id, schema.missions.courseId)).where(where)
    .orderBy(asc(schema.missions.courseId), asc(schema.missions.stage), asc(schema.missions.position));
}

export type MissionState = "done" | "current" | "locked";

/** The map: missions grouped by stage; a mission unlocks when every earlier one in its path is submitted. */
export async function missionMap(studentId: string) {
  const rows = await visibleMissions(studentId);
  const subs = new Map((await db.select().from(schema.missionSubmissions).where(eq(schema.missionSubmissions.studentId, studentId))).map((s) => [s.missionId, s]));
  const paths = new Map<string, typeof rows>();
  for (const r of rows) { const k = r.m.courseId ?? "global"; (paths.get(k) ?? paths.set(k, []).get(k)!).push(r); }
  const out = [];
  for (const [key, list] of paths) {
    let currentTaken = false;
    const items = list.map((r) => {
      const sub = subs.get(r.m.id);
      let state: MissionState = "locked";
      if (sub) state = "done"; else if (!currentTaken) { state = "current"; currentTaken = true; }
      return { id: r.m.id, stage: r.m.stage, title: r.m.title, skill: r.m.skill, points: r.m.points, coins: r.m.coins, minutes: r.m.minutes, state, score: sub?.coachScore ?? sub?.aiScore ?? null };
    });
    const stages = [...new Set(items.map((i) => i.stage))].map((s) => ({ stage: s, missions: items.filter((i) => i.stage === s) }));
    out.push({ pathId: key, title: list[0].course ?? "مسیر عمومی کنجد", stages, done: items.filter((i) => i.state === "done").length, total: items.length });
  }
  return out;
}

export async function nextMission(studentId: string) {
  for (const p of await missionMap(studentId)) for (const s of p.stages) for (const m of s.missions) if (m.state === "current") return { ...m, path: p.title };
  return null;
}

export async function getMission(studentId: string, missionId: string) {
  const [r] = await db.select({ m: schema.missions, course: schema.courses.title }).from(schema.missions).leftJoin(schema.courses, eq(schema.courses.id, schema.missions.courseId)).where(eq(schema.missions.id, missionId));
  if (!r) throw notFound("مأموریت");
  const map = await missionMap(studentId);
  const item = map.flatMap((p) => p.stages.flatMap((s) => s.missions)).find((m) => m.id === missionId);
  if (!item) throw forbidden();
  const [sub] = await db.select().from(schema.missionSubmissions).where(and(eq(schema.missionSubmissions.missionId, missionId), eq(schema.missionSubmissions.studentId, studentId)));
  return {
    id: r.m.id, title: r.m.title, description: r.m.description, skill: r.m.skill, instruction: r.m.instruction, minutes: r.m.minutes, points: r.m.points, coins: r.m.coins, course: r.course, state: item.state,
    submission: sub ? { text: sub.text, status: sub.status, aiScore: sub.aiScore, aiFeedback: sub.aiFeedback, coachReview: sub.coachReview, coachScore: sub.coachScore, coachFeedback: sub.coachFeedback, pointsAwarded: sub.pointsAwarded, coinsAwarded: sub.coinsAwarded } : null,
  };
}

export async function submitMission(studentId: string, missionId: string, input: z.infer<typeof missionSubmitSchema>) {
  const detail = await getMission(studentId, missionId);
  if (detail.state === "locked") throw new ApiError(409, "locked", "اول مأموریت‌های قبلی رو تموم کن.");
  if (detail.state === "done") throw new ApiError(409, "done", "این مأموریت رو قبلاً ارسال کردی.");
  const [m] = await db.select().from(schema.missions).where(eq(schema.missions.id, missionId));
  const result = await evaluate({ missionTitle: m.title, skill: m.skill, contentSummary: m.contentSummary, instruction: m.instruction, answer: input.text });
  const points = Math.round((m.points * result.score) / 100);
  const coins = result.score >= 60 ? m.coins : 0;
  const [sub] = await db.insert(schema.missionSubmissions).values({
    missionId, studentId, text: input.text, mediaUrl: input.mediaUrl, mediaKind: input.mediaKind, status: "evaluated",
    aiScore: result.score, aiFeedback: result.feedback, aiProvider: result.provider, pointsAwarded: points, coinsAwarded: coins,
  }).returning();
  await db.insert(schema.skillEvents).values({ userId: studentId, skill: m.skill, score: result.score });
  await award(studentId, points, coins, `مأموریت «${m.title}»`, { type: "mission", id: sub.id });
  await notify(studentId, "evaluation", "نتیجه ارزیابی مأموریتت آماده‌ست", `${result.score.toLocaleString("fa-IR")} از ۱۰۰ — ${result.feedback}`, `/panel/student/missions/${missionId}`);
  // tell the coach(es) of the student's classes that there is something to review
  const coaches = await db.select({ c: schema.classes.coachId }).from(schema.enrollments).innerJoin(schema.classes, eq(schema.classes.id, schema.enrollments.classId)).where(eq(schema.enrollments.studentId, studentId));
  for (const c of new Set(coaches.map((x) => x.c))) await notify(c, "review", "خروجی جدید برای بررسی", m.title, "/panel/coach/evaluations");
  return { submissionId: sub.id, score: result.score, feedback: result.feedback, provider: result.provider, points, coins };
}

/** Coach review: approve the AI score or adjust it; point difference is applied to the student. */
export async function reviewSubmission(coachId: string, submissionId: string, input: z.infer<typeof reviewSchema>, isAdmin = false) {
  const [r] = await db.select({ s: schema.missionSubmissions, m: schema.missions }).from(schema.missionSubmissions).innerJoin(schema.missions, eq(schema.missions.id, schema.missionSubmissions.missionId)).where(eq(schema.missionSubmissions.id, submissionId));
  if (!r) throw notFound("خروجی");
  if (!isAdmin) {
    const [own] = await db.select({ x: schema.enrollments.studentId }).from(schema.enrollments).innerJoin(schema.classes, eq(schema.classes.id, schema.enrollments.classId))
      .where(and(eq(schema.enrollments.studentId, r.s.studentId), eq(schema.classes.coachId, coachId)));
    if (!own) throw forbidden();
  }
  const score = input.action === "adjust" ? (input.score ?? r.s.aiScore ?? 0) : (r.s.aiScore ?? 0);
  const newPoints = Math.round((r.m.points * score) / 100);
  const newCoins = score >= 60 ? r.m.coins : 0;
  const dp = newPoints - r.s.pointsAwarded, dc = newCoins - r.s.coinsAwarded;
  await db.update(schema.missionSubmissions).set({
    coachReview: input.action === "approve" ? "approved" : "adjusted", coachScore: score, coachFeedback: input.feedback, status: "reviewed", pointsAwarded: newPoints, coinsAwarded: newCoins,
  }).where(eq(schema.missionSubmissions.id, submissionId));
  if (dp || dc) await award(r.s.studentId, dp, dc, `بازبینی مربی: «${r.m.title}»`, { type: "mission", id: submissionId });
  await notify(r.s.studentId, "review", "مربی خروجی‌ت رو بررسی کرد", input.feedback ?? `امتیاز نهایی: ${score.toLocaleString("fa-IR")}`, `/panel/student/missions/${r.m.id}`);
  return { score, points: newPoints, coins: newCoins };
}

export async function recentSubmissions(studentId: string, limit = 5) {
  return db.select({ id: schema.missionSubmissions.id, title: schema.missions.title, missionId: schema.missions.id, score: schema.missionSubmissions.aiScore, coachScore: schema.missionSubmissions.coachScore, createdAt: schema.missionSubmissions.createdAt })
    .from(schema.missionSubmissions).innerJoin(schema.missions, eq(schema.missions.id, schema.missionSubmissions.missionId)).where(eq(schema.missionSubmissions.studentId, studentId)).orderBy(desc(schema.missionSubmissions.createdAt)).limit(limit);
}
