import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/client";
import { forbidden, notFound } from "../http/errors";
import { attendanceSchema, classSchema } from "../validation";
import { notify } from "./common";

export async function ownClass(coachId: string, classId: string, isAdmin = false) {
  const [c] = await db.select().from(schema.classes).where(eq(schema.classes.id, classId));
  if (!c) throw notFound("کلاس");
  if (c.coachId !== coachId && !isAdmin) throw forbidden();
  return c;
}

export async function createClass(coachId: string, input: z.infer<typeof classSchema>) {
  const [course] = await db.select().from(schema.courses).where(eq(schema.courses.id, input.courseId));
  if (!course) throw notFound("دوره");
  const [c] = await db.insert(schema.classes).values({ courseId: course.id, coachId, name: input.name, schedule: input.schedule }).returning();
  // students already enrolled in the course and not yet in a class join this one
  await db.update(schema.enrollments).set({ classId: c.id }).where(and(eq(schema.enrollments.courseId, course.id), sql`${schema.enrollments.classId} is null`));
  return c;
}

/** Students enrolled in the class's course who are not in any class yet; the coach can claim them. */
export async function unassignedStudents(coachId: string, classId: string, isAdmin = false) {
  const c = await ownClass(coachId, classId, isAdmin);
  return db.select({ id: schema.users.id, name: schema.users.displayName }).from(schema.enrollments).innerJoin(schema.users, eq(schema.users.id, schema.enrollments.studentId))
    .where(and(eq(schema.enrollments.courseId, c.courseId), sql`${schema.enrollments.classId} is null`));
}
export async function addStudentToClass(coachId: string, classId: string, studentId: string, isAdmin = false) {
  const c = await ownClass(coachId, classId, isAdmin);
  const r = await db.update(schema.enrollments).set({ classId }).where(and(eq(schema.enrollments.courseId, c.courseId), eq(schema.enrollments.studentId, studentId), sql`${schema.enrollments.classId} is null`)).returning();
  if (!r.length) throw notFound("مهارت‌آموز بدون کلاس");
  await notify(studentId, "class", `به کلاس «${c.name}» اضافه شدی`, undefined, "/panel/student/dashboard");
  return { added: true };
}

export async function listClasses(coachId: string) {
  const rows = await db.select({ c: schema.classes, course: schema.courses.title, students: sql<number>`count(distinct ${schema.enrollments.studentId})` })
    .from(schema.classes).innerJoin(schema.courses, eq(schema.courses.id, schema.classes.courseId)).leftJoin(schema.enrollments, eq(schema.enrollments.classId, schema.classes.id))
    .where(eq(schema.classes.coachId, coachId)).groupBy(schema.classes.id, schema.courses.title).orderBy(desc(schema.classes.createdAt));
  const out = [];
  for (const r of rows) {
    const avg = await classAverage(r.c.id);
    const [last] = await db.select({ t: sql<Date>`max(${schema.missionSubmissions.createdAt})` }).from(schema.missionSubmissions).where(sql`${schema.missionSubmissions.studentId} in (select student_id from enrollments where class_id = ${r.c.id})`);
    out.push({ id: r.c.id, name: r.c.name, course: r.course, students: Number(r.students), schedule: r.c.schedule, status: r.c.status, avgProgress: avg, lastActivity: last?.t ?? null });
  }
  return out;
}

/** Share of the course's missions completed, averaged over the class. */
async function classAverage(classId: string) {
  const [x] = await db.select({
    done: sql<number>`count(distinct ${schema.missionSubmissions.id})`,
    students: sql<number>`count(distinct ${schema.enrollments.studentId})`,
    missions: sql<number>`(select count(*) from missions m join classes c on c.course_id = m.course_id where c.id = ${classId})`,
  }).from(schema.enrollments).leftJoin(schema.missionSubmissions, eq(schema.missionSubmissions.studentId, schema.enrollments.studentId)).where(eq(schema.enrollments.classId, classId));
  const denom = Number(x.students) * Number(x.missions);
  return denom ? Math.min(100, Math.round((Number(x.done) / denom) * 100)) : 0;
}

export async function classDetail(coachId: string, classId: string, isAdmin = false) {
  const c = await ownClass(coachId, classId, isAdmin);
  const students = await db.select({ id: schema.users.id, name: schema.users.displayName, points: schema.studentProfiles.points, level: schema.studentProfiles.level })
    .from(schema.enrollments).innerJoin(schema.users, eq(schema.users.id, schema.enrollments.studentId)).innerJoin(schema.studentProfiles, eq(schema.studentProfiles.userId, schema.users.id)).where(eq(schema.enrollments.classId, classId));
  const ids = students.map((s) => s.id);
  const [{ n: total }] = await db.select({ n: sql<number>`count(*)` }).from(schema.missions).where(eq(schema.missions.courseId, c.courseId));
  const done = ids.length ? await db.select({ s: schema.missionSubmissions.studentId, n: sql<number>`count(*)` }).from(schema.missionSubmissions).innerJoin(schema.missions, eq(schema.missions.id, schema.missionSubmissions.missionId)).where(and(inArray(schema.missionSubmissions.studentId, ids), eq(schema.missions.courseId, c.courseId))).groupBy(schema.missionSubmissions.studentId) : [];
  const att = ids.length ? await db.select({ s: schema.attendanceRecords.studentId, status: schema.attendanceRecords.status, n: sql<number>`count(*)` }).from(schema.attendanceRecords).innerJoin(schema.attendanceSessions, eq(schema.attendanceSessions.id, schema.attendanceRecords.sessionId)).where(and(eq(schema.attendanceSessions.classId, classId), inArray(schema.attendanceRecords.studentId, ids))).groupBy(schema.attendanceRecords.studentId, schema.attendanceRecords.status) : [];
  return {
    id: c.id, name: c.name, schedule: c.schedule, courseId: c.courseId,
    students: students.map((s) => {
      const d = Number(done.find((x) => x.s === s.id)?.n ?? 0);
      const mine = att.filter((x) => x.s === s.id); const present = Number(mine.find((x) => x.status === "present")?.n ?? 0) + Number(mine.find((x) => x.status === "late")?.n ?? 0); const all = mine.reduce((a, b) => a + Number(b.n), 0);
      return { ...s, missionsDone: d, missionsTotal: Number(total), missionsLeft: Math.max(0, Number(total) - d), progress: Number(total) ? Math.round((d / Number(total)) * 100) : 0, attendance: all ? Math.round((present / all) * 100) : null };
    }),
  };
}

export async function recordAttendance(coachId: string, classId: string, input: z.infer<typeof attendanceSchema>, isAdmin = false) {
  await ownClass(coachId, classId, isAdmin);
  const [s] = await db.insert(schema.attendanceSessions).values({ classId, title: input.title }).returning();
  const valid = new Set((await db.select({ s: schema.enrollments.studentId }).from(schema.enrollments).where(eq(schema.enrollments.classId, classId))).map((x) => x.s));
  const rows = input.records.filter((r) => valid.has(r.studentId)).map((r) => ({ sessionId: s.id, studentId: r.studentId, status: r.status, note: r.note }));
  if (rows.length) await db.insert(schema.attendanceRecords).values(rows);
  for (const r of rows.filter((x) => x.status === "absent")) await notify(r.studentId, "attendance", "غیبت در جلسه ثبت شد", input.title);
  return { sessionId: s.id, recorded: rows.length };
}

export async function attendanceReport(coachId: string, classId: string, isAdmin = false) {
  await ownClass(coachId, classId, isAdmin);
  const sessions = await db.select().from(schema.attendanceSessions).where(eq(schema.attendanceSessions.classId, classId)).orderBy(desc(schema.attendanceSessions.heldAt)).limit(20);
  const counts = sessions.length ? await db.select({ sid: schema.attendanceRecords.sessionId, status: schema.attendanceRecords.status, n: sql<number>`count(*)` }).from(schema.attendanceRecords).where(inArray(schema.attendanceRecords.sessionId, sessions.map((s) => s.id))).groupBy(schema.attendanceRecords.sessionId, schema.attendanceRecords.status) : [];
  return sessions.map((s) => ({ id: s.id, title: s.title, heldAt: s.heldAt, present: Number(counts.find((c) => c.sid === s.id && c.status === "present")?.n ?? 0), late: Number(counts.find((c) => c.sid === s.id && c.status === "late")?.n ?? 0), absent: Number(counts.find((c) => c.sid === s.id && c.status === "absent")?.n ?? 0) }));
}

/** Submissions of this coach's students, newest first, pending review on top. */
export async function evaluationQueue(coachId: string, isAdmin = false) {
  const base = db.select({
    id: schema.missionSubmissions.id, student: schema.users.displayName, mission: schema.missions.title, text: schema.missionSubmissions.text, mediaUrl: schema.missionSubmissions.mediaUrl,
    aiScore: schema.missionSubmissions.aiScore, aiFeedback: schema.missionSubmissions.aiFeedback, review: schema.missionSubmissions.coachReview, coachScore: schema.missionSubmissions.coachScore,
    coachFeedback: schema.missionSubmissions.coachFeedback, createdAt: schema.missionSubmissions.createdAt,
  }).from(schema.missionSubmissions).innerJoin(schema.users, eq(schema.users.id, schema.missionSubmissions.studentId)).innerJoin(schema.missions, eq(schema.missions.id, schema.missionSubmissions.missionId))
    .innerJoin(schema.enrollments, eq(schema.enrollments.studentId, schema.missionSubmissions.studentId)).innerJoin(schema.classes, eq(schema.classes.id, schema.enrollments.classId));
  const rows = await (isAdmin ? base : base.where(eq(schema.classes.coachId, coachId))).orderBy(desc(schema.missionSubmissions.createdAt)).limit(60);
  return rows.sort((a, b) => Number(b.review === "pending") - Number(a.review === "pending"));
}

export async function coachDashboard(coachId: string) {
  const classes = await listClasses(coachId);
  const [pending] = await db.select({ n: sql<number>`count(distinct ${schema.missionSubmissions.id})` }).from(schema.missionSubmissions).innerJoin(schema.enrollments, eq(schema.enrollments.studentId, schema.missionSubmissions.studentId)).innerJoin(schema.classes, eq(schema.classes.id, schema.enrollments.classId))
    .where(and(eq(schema.classes.coachId, coachId), eq(schema.missionSubmissions.coachReview, "pending")));
  const [act] = await db.select({ n: sql<number>`count(distinct ${schema.challengeClasses.challengeId})` }).from(schema.challengeClasses).innerJoin(schema.classes, eq(schema.classes.id, schema.challengeClasses.classId)).where(eq(schema.classes.coachId, coachId));
  const [next] = await db.select({ n: sql<number>`count(distinct ${schema.missions.id})` }).from(schema.missions).innerJoin(schema.classes, eq(schema.classes.courseId, schema.missions.courseId)).where(eq(schema.classes.coachId, coachId));
  return { classes, totalStudents: classes.reduce((a, c) => a + c.students, 0), pendingReviews: Number(pending.n), activeChallenges: Number(act.n), activeMissions: Number(next.n), avgProgress: classes.length ? Math.round(classes.reduce((a, c) => a + c.avgProgress, 0) / classes.length) : 0 };
}

export async function classReport(coachId: string, classId: string, isAdmin = false) {
  const d = await classDetail(coachId, classId, isAdmin);
  const att = await attendanceReport(coachId, classId, isAdmin);
  const ids = d.students.map((s) => s.id);
  const skills = ids.length ? await db.select({ skill: schema.skillEvents.skill, avg: sql<number>`round(avg(${schema.skillEvents.score}))` }).from(schema.skillEvents).where(inArray(schema.skillEvents.userId, ids)).groupBy(schema.skillEvents.skill) : [];
  const { classChallengeResults } = await import("./challenges");
  return {
    className: d.name, avgProgress: d.students.length ? Math.round(d.students.reduce((a, s) => a + s.progress, 0) / d.students.length) : 0,
    participation: d.students.length ? Math.round((d.students.filter((s) => s.missionsDone > 0).length / d.students.length) * 100) : 0,
    completedMissions: d.students.reduce((a, s) => a + s.missionsDone, 0), students: d.students, skills: skills.map((s) => ({ skill: s.skill, avg: Number(s.avg) })), attendance: att, challenges: (await classChallengeResults(classId)).map((c) => ({ ...c, participants: Number(c.participants) })),
  };
}
