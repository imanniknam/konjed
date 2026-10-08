import { and, asc, count, desc, eq } from "drizzle-orm";
import { db, schema } from "../db/client";
import { ApiError, notFound } from "../http/errors";
import { GROUP_FA, notify } from "./common";

const CAT_FA: Record<string, string> = { ...GROUP_FA, computer: "کامپیوتر", content: "تولید محتوا", marketing: "دیجیتال مارکتینگ", design: "طراحی" };
const STATUS_FA = { draft: "پیش‌نویس", registering: "ثبت‌نام فعال", running: "در حال برگزاری", finished: "پایان‌یافته" } as const;

const dto = (c: typeof schema.courses.$inferSelect, enrolled = 0) => ({
  id: c.id, slug: c.slug, title: c.title, description: c.description, category: c.category, categoryLabel: CAT_FA[c.category], skills: c.skills,
  ageLabel: `${c.ageMin.toLocaleString("fa-IR")} تا ${c.ageMax.toLocaleString("fa-IR")} سال`, ageMin: c.ageMin, ageMax: c.ageMax,
  status: c.status, statusLabel: STATUS_FA[c.status], startsAt: c.startsAt, capacity: c.capacity, seatsLeft: c.capacity ? Math.max(0, c.capacity - enrolled) : null, featured: c.featured, suggested: c.suggested,
});

export async function listCourses(opts: { status?: "registering"; featured?: boolean } = {}) {
  const rows = await db.select({ c: schema.courses, n: count(schema.enrollments.studentId) }).from(schema.courses)
    .leftJoin(schema.enrollments, eq(schema.enrollments.courseId, schema.courses.id)).where(opts.status ? eq(schema.courses.status, opts.status) : undefined)
    .groupBy(schema.courses.id).orderBy(desc(schema.courses.featured), asc(schema.courses.createdAt));
  return rows.filter((r) => r.c.status !== "draft").map((r) => dto(r.c, r.n));
}

export async function getCourse(slug: string) {
  const [r] = await db.select({ c: schema.courses, n: count(schema.enrollments.studentId) }).from(schema.courses)
    .leftJoin(schema.enrollments, eq(schema.enrollments.courseId, schema.courses.id)).where(eq(schema.courses.slug, slug)).groupBy(schema.courses.id);
  if (!r) throw notFound("دوره");
  return dto(r.c, r.n);
}

export async function enroll(studentId: string, slug: string) {
  const [c] = await db.select().from(schema.courses).where(eq(schema.courses.slug, slug));
  if (!c) throw notFound("دوره");
  if (c.status !== "registering") throw new ApiError(409, "closed", "ثبت‌نام این دوره فعال نیست.");
  const [n] = await db.select({ n: count() }).from(schema.enrollments).where(eq(schema.enrollments.courseId, c.id));
  if (c.capacity && n.n >= c.capacity) throw new ApiError(409, "full", "ظرفیت این دوره تکمیل شده.");
  const [u] = await db.select({ birthYear: schema.users.birthYear }).from(schema.users).where(eq(schema.users.id, studentId));
  if (u?.birthYear) {
    const age = new Date().getFullYear() - u.birthYear;
    if (age < c.ageMin - 1 || age > c.ageMax + 1) throw new ApiError(409, "age", `این دوره برای ${c.ageMin} تا ${c.ageMax} سال است.`);
  }
  const ins = await db.insert(schema.enrollments).values({ courseId: c.id, studentId }).onConflictDoNothing().returning();
  if (!ins.length) throw new ApiError(409, "already", "قبلاً در این دوره ثبت‌نام کردی.");
  // the coach adds enrolled students to a class (or a new class picks up everyone still unassigned)
  const coaches = await db.select({ c: schema.classes.coachId }).from(schema.classes).where(eq(schema.classes.courseId, c.id));
  for (const x of new Set(coaches.map((y) => y.c))) await notify(x, "enroll", "ثبت‌نام جدید در دوره‌ات", c.title, "/panel/coach/classes");
  await notify(studentId, "enroll", `ثبت‌نامت در «${c.title}» انجام شد`, "مأموریت‌های دوره توی «مأموریت‌های من» منتظرته.", "/panel/student/missions");
  return { enrolled: true };
}

export async function myCourses(studentId: string) {
  const rows = await db.select({ c: schema.courses }).from(schema.enrollments).innerJoin(schema.courses, eq(schema.courses.id, schema.enrollments.courseId)).where(eq(schema.enrollments.studentId, studentId));
  return rows.map((r) => dto(r.c));
}
