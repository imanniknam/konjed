import { desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { z } from "zod";
import { hashPassword } from "../auth/password";
import { db, schema } from "../db/client";
import { ApiError, notFound } from "../http/errors";
import { identifier } from "../validation";

/** One declarative definition drives: list API, create/update validation, and the generic admin form. */
export type FieldType = "text" | "textarea" | "number" | "select" | "checkbox" | "datetime" | "tags" | "image" | "url" | "json" | "password";
export type AdminField = { name: string; label: string; type: FieldType; required?: boolean; options?: [string, string][]; hint?: string; list?: boolean; max?: number; min?: number; createOnly?: boolean };

type Def = {
  key: string; title: string; table: PgTable; fields: AdminField[]; search?: string[];
  create?: boolean; remove?: boolean; label: (row: any) => string;
  /** custom list query (joins) */
  list?: () => Promise<any[]>;
  beforeSave?: (data: any, existing?: any) => Promise<any> | any;
};

const GROUPS: [string, string][] = [["soft", "مهارت‌های نرم"], ["finance", "سواد مالی"], ["entrepreneurship", "کارآفرینی"]];
const STATUS_COURSE: [string, string][] = [["draft", "پیش‌نویس (نمایش داده نمی‌شود)"], ["registering", "در حال ثبت‌نام"], ["running", "در حال برگزاری"], ["finished", "پایان‌یافته"]];
export const ICONS: [string, string][] = ["badgeStar", "badgePurple", "medalBlue", "crown", "medalPurple", "crystal", "scroll", "backpack", "trophy"].map((x) => [x, x]);

const f = (name: string, label: string, type: FieldType, extra: Partial<AdminField> = {}): AdminField => ({ name, label, type, ...extra });

export function courseOptions() { return db.select({ id: schema.courses.id, title: schema.courses.title }).from(schema.courses).then((r) => r.map((c) => [c.id, c.title] as [string, string])); }

export const RESOURCES: Record<string, Def> = {
  courses: {
    key: "courses", title: "دوره‌ها", table: schema.courses, create: true, remove: true, search: ["title", "slug"], label: (r) => r.title,
    fields: [f("title", "عنوان دوره", "text", { required: true, list: true }), f("slug", "نشانی (انگلیسی، یکتا)", "text", { required: true, hint: "مثلاً creativity-problem-solving" }), f("description", "توضیح", "textarea"),
      f("category", "دسته", "select", { required: true, list: true, options: [["soft", "مهارت‌های نرم"], ["finance", "سواد مالی"], ["entrepreneurship", "کارآفرینی"], ["computer", "کامپیوتر"], ["content", "تولید محتوا"], ["marketing", "دیجیتال مارکتینگ"], ["design", "طراحی"]] }),
      f("skills", "مهارت‌ها", "tags", { hint: "با ویرگول جدا کن" }), f("ageMin", "حداقل سن", "number", { min: 8, max: 25 }), f("ageMax", "حداکثر سن", "number", { min: 8, max: 25 }),
      f("status", "وضعیت", "select", { options: STATUS_COURSE, list: true }), f("startsAt", "شروع دوره", "datetime"), f("capacity", "ظرفیت", "number", { min: 1, max: 5000 }),
      f("featured", "دوره منتخب صفحه اصلی", "checkbox", { list: true }), f("suggested", "جزو دوره‌های پیشنهادی", "checkbox")],
  },
  missions: {
    key: "missions", title: "مأموریت‌ها", table: schema.missions, create: true, remove: true, search: ["title", "skill"], label: (r) => r.title,
    list: async () => (await db.select({ m: schema.missions, course: schema.courses.title }).from(schema.missions).leftJoin(schema.courses, eq(schema.courses.id, schema.missions.courseId)).orderBy(schema.missions.courseId, schema.missions.stage, schema.missions.position)).map((r) => ({ ...r.m, courseTitle: r.course ?? "عمومی" })),
    fields: [f("title", "عنوان مأموریت", "text", { required: true, list: true }), f("courseId", "دوره", "select", { hint: "خالی = مسیر عمومی برای همه", list: true }), f("stage", "مرحله", "number", { min: 1, max: 50, list: true }), f("position", "ترتیب در مرحله", "number", { min: 1, max: 50 }),
      f("skill", "مهارت هدف", "text", { required: true, list: true }), f("description", "توضیح", "textarea"), f("instruction", "دستور انجام", "textarea", { required: true }), f("contentSummary", "خلاصه محتوای جلسه (برای ارزیاب هوش مصنوعی)", "textarea", { hint: "مفاهیم کلیدی جلسه؛ پاسخ مهارت‌آموز با این مقایسه می‌شود." }),
      f("minutes", "زمان پیشنهادی (دقیقه)", "number", { min: 1, max: 600 }), f("points", "امتیاز", "number", { min: 0, max: 1000 }), f("coins", "سکه", "number", { min: 0, max: 1000 })],
  },
  games: {
    key: "games", title: "بازی‌ها", table: schema.games, create: true, remove: true, search: ["title", "slug", "skillLabel"], label: (r) => r.title,
    fields: [f("title", "نام بازی", "text", { required: true, list: true }), f("slug", "نشانی (انگلیسی، یکتا)", "text", { required: true }), f("shortText", "توضیح کوتاه", "textarea", { required: true }), f("cover", "کاور", "image", { required: true }),
      f("accent", "رنگ تأکید (#RRGGBB)", "text"), f("skillGroup", "گروه مهارت", "select", { required: true, options: GROUPS, list: true }), f("skillLabel", "برچسب مهارت", "text", { required: true, list: true }), f("genre", "ژانر", "text"),
      f("ageMin", "حداقل سن", "number", { min: 8, max: 25 }), f("ageMax", "حداکثر سن", "number", { min: 8, max: 25 }), f("minutes", "مدت (دقیقه)", "number", { min: 1, max: 600 }),
      f("priceModel", "رایگان / پولی", "select", { options: [["free", "رایگان"], ["paid", "پولی"]] }), f("priceAmount", "قیمت (تومان)", "number", { min: 0 }), f("tags", "برچسب‌ها", "tags", { hint: "مثلاً جدید، محبوب، منتخب کنجد" }),
      f("creatorName", "سازنده", "text"), f("playUrl", "لینک اجرای بازی", "url"), f("featured", "منتخب", "checkbox", { list: true }), f("status", "وضعیت", "select", { options: [["published", "منتشرشده"], ["draft", "پیش‌نویس"]], list: true })],
    beforeSave: (d) => ({ ...d, ...(d.status === "published" ? {} : {}) }),
  },
  badges: {
    key: "badges", title: "نشان‌ها", table: schema.badges, create: true, remove: true, search: ["title", "code"], label: (r) => r.title,
    fields: [f("title", "نام نشان", "text", { required: true, list: true }), f("code", "کد یکتا (انگلیسی)", "text", { required: true }), f("description", "شرط/توضیح", "textarea", { required: true }), f("icon", "آیکون", "select", { options: ICONS }),
      f("skillGroup", "گروه مهارت", "select", { options: GROUPS }),
      f("rule", "قانون دریافت (JSON)", "json", { required: true, hint: 'نمونه: {"type":"missions_in_skill","skill":"حل مسئله","count":3} — نوع‌ها: missions_total, missions_in_skill, projects, projects_in_skill, group_projects, games_played, challenges' })],
  },
  challenges: {
    key: "challenges", title: "چالش‌ها و مسابقات", table: schema.challenges, create: true, remove: true, search: ["title", "slug"], label: (r) => r.title,
    fields: [f("title", "عنوان", "text", { required: true, list: true }), f("slug", "نشانی (انگلیسی، یکتا)", "text", { required: true }), f("description", "توضیح", "textarea", { required: true }), f("skill", "مهارت", "text", { required: true, list: true }),
      f("kind", "نوع", "select", { options: [["challenge", "چالش"], ["contest", "مسابقه"]] }), f("deadlineLabel", "مهلت (متن نمایشی)", "text"), f("deadline", "مهلت (تاریخ)", "datetime"), f("status", "وضعیت سراسری", "select", { options: [["upcoming", "به‌زودی"], ["active", "فعال برای همه"], ["finished", "پایان‌یافته"]], list: true }),
      f("points", "امتیاز", "number", { min: 0, max: 5000 }), f("coins", "سکه", "number", { min: 0, max: 5000 }), f("badgeCode", "کد نشان جایزه", "text")],
  },
  toolbox: {
    key: "toolbox", title: "جعبه ابزار", table: schema.toolboxItems, create: true, remove: true, search: ["title"], label: (r) => r.title,
    fields: [f("title", "عنوان", "text", { required: true, list: true }), f("kind", "نوع", "select", { required: true, options: [["tool", "ابزار"], ["exercise", "تمرین کوتاه"], ["template", "الگو و قالب"], ["checklist", "چک‌لیست"], ["activity", "فعالیت پیشنهادی"]], list: true }),
      f("skillGroup", "گروه مهارت", "select", { required: true, options: GROUPS, list: true }), f("body", "محتوا", "textarea", { required: true })],
  },
  projects: {
    key: "projects", title: "پروژه‌های ویترین (نظارت)", table: schema.projects, remove: true, search: ["title"], label: (r) => r.title,
    list: async () => (await db.select({ p: schema.projects, author: schema.users.displayName }).from(schema.projects).innerJoin(schema.users, eq(schema.users.id, schema.projects.authorId)).orderBy(desc(schema.projects.createdAt)).limit(300)).map((r) => ({ ...r.p, author: r.author })),
    fields: [f("title", "عنوان", "text", { required: true, list: true }), f("author", "سازنده", "text", { list: true, createOnly: true }), f("description", "توضیح", "textarea"), f("skill", "مهارت", "text"),
      f("kind", "نوع", "select", { options: [["individual", "فردی"], ["group", "گروهی"], ["learning_experience", "تجربه یادگیری"], ["idea", "ایده خلاقانه"]] }), f("featured", "منتخب", "checkbox", { list: true }),
      f("status", "وضعیت", "select", { options: [["published", "منتشرشده"], ["hidden", "پنهان (نقض قوانین)"]], list: true })],
  },
  comments: {
    key: "comments", title: "نظرهای پروژه‌ها (نظارت)", table: schema.projectComments, remove: true, label: (r) => r.body.slice(0, 40),
    list: async () => (await db.select({ c: schema.projectComments, author: schema.users.displayName, project: schema.projects.title }).from(schema.projectComments).innerJoin(schema.users, eq(schema.users.id, schema.projectComments.userId)).innerJoin(schema.projects, eq(schema.projects.id, schema.projectComments.projectId)).orderBy(desc(schema.projectComments.createdAt)).limit(300)).map((r) => ({ ...r.c, author: r.author, project: r.project })),
    fields: [f("body", "نظر", "textarea", { list: true }), f("author", "نویسنده", "text", { list: true }), f("project", "پروژه", "text", { list: true })],
  },
  classes: {
    key: "classes", title: "کلاس‌ها", table: schema.classes, remove: true, search: ["name"], label: (r) => r.name,
    list: async () => (await db.select({ c: schema.classes, coach: schema.users.displayName, course: schema.courses.title }).from(schema.classes).innerJoin(schema.users, eq(schema.users.id, schema.classes.coachId)).innerJoin(schema.courses, eq(schema.courses.id, schema.classes.courseId)).orderBy(desc(schema.classes.createdAt))).map((r) => ({ ...r.c, coach: r.coach, course: r.course })),
    fields: [f("name", "نام کلاس", "text", { required: true, list: true }), f("coach", "مربی", "text", { list: true, createOnly: true }), f("course", "دوره", "text", { list: true, createOnly: true }), f("schedule", "زمان جلسات", "text", { list: true }), f("status", "وضعیت", "select", { options: [["active", "فعال"], ["archived", "بایگانی"]], list: true })],
  },
  users: {
    key: "users", title: "کاربران", table: schema.users, create: true, remove: true, search: ["displayName", "email", "phone"], label: (r) => r.displayName,
    list: async () => (await db.select({ id: schema.users.id, role: schema.users.role, email: schema.users.email, phone: schema.users.phone, displayName: schema.users.displayName, disabled: schema.users.disabled, approved: schema.users.approved, createdAt: schema.users.createdAt }).from(schema.users).orderBy(desc(schema.users.createdAt)).limit(500)),
    fields: [f("displayName", "نام", "text", { required: true, list: true }), f("identifier", "ایمیل یا موبایل", "text", { required: true, createOnly: true }), f("password", "رمز عبور (حداقل ۸ نویسه)", "password", { required: true, createOnly: true }),
      f("role", "نقش", "select", { required: true, list: true, options: [["student", "مهارت‌آموز"], ["coach", "مربی"], ["parent", "والدین"], ["admin", "مدیر"]] }), f("approved", "تأییدشده (برای مربی)", "checkbox", { list: true }), f("disabled", "مسدود", "checkbox", { list: true })],
  },
};

/* ───────── generic validation / mapping ───────── */
const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);

function zodFor(fields: AdminField[], partial: boolean, mode: "create" | "update") {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const fd of fields) {
    if (fd.createOnly && mode === "update") continue;
    if (["author", "coach", "course", "project"].includes(fd.name) && fd.createOnly) continue;
    let t: z.ZodTypeAny;
    switch (fd.type) {
      case "number": t = z.coerce.number().int(`«${fd.label}» باید عدد صحیح باشد.`).min(fd.min ?? 0, `«${fd.label}» کمتر از حد مجاز است.`).max(fd.max ?? 1_000_000_000); break;
      case "checkbox": t = z.coerce.boolean(); break;
      case "select": t = fd.options ? z.enum(fd.options.map((o) => o[0]) as [string, ...string[]], { error: `«${fd.label}» را درست انتخاب کن.` }) : z.string().uuid(`«${fd.label}» را درست انتخاب کن.`); break;
      case "tags": t = z.preprocess((v) => (Array.isArray(v) ? v : typeof v === "string" ? v.split(/[,،]/).map((s) => s.trim()).filter(Boolean) : v), z.array(z.string().max(60)).max(20)); break;
      case "datetime": t = z.preprocess((v) => (v ? new Date(String(v)) : undefined), z.date({ error: `«${fd.label}» تاریخ معتبر نیست.` })); break;
      case "json": t = z.preprocess((v) => { if (typeof v !== "string") return v; try { return JSON.parse(v); } catch { return "__bad__"; } }, z.object({ type: z.enum(["missions_total", "missions_in_skill", "projects", "projects_in_skill", "group_projects", "games_played", "challenges"]), count: z.coerce.number().int().min(1), skill: z.string().optional() }, { error: "قانون نشان معتبر نیست." })); break;
      case "url": case "image": t = z.string().trim().max(600).refine((v) => v === "" || /^(\/(?!\/)|https?:\/\/)/.test(v), `«${fd.label}» باید لینک http(s) یا مسیر داخلی باشد.`); break;
      default: t = z.string().trim().min(fd.required ? 1 : 0, `«${fd.label}» را وارد کن.`).max(fd.max ?? 20_000);
    }
    shape[fd.name] = fd.required && !partial ? t : t.optional();
  }
  return z.object(shape).strip();
}

/** Strip UI-only/display columns that don't exist on the table. */
function columns(def: Def) {
  const cols = new Set(Object.keys((def.table as any)[Symbol.for("drizzle:Columns")] ?? {}));
  return cols;
}

export async function listResource(key: string, q?: string) {
  const def = RESOURCES[key] ?? (() => { throw notFound("منبع"); })();
  let rows: any[];
  if (def.list) rows = await def.list();
  else rows = await db.select().from(def.table).orderBy(desc((def.table as any).createdAt ?? (def.table as any).id)).limit(500);
  rows = rows.map((r) => { const { passwordHash, ...rest } = r; void passwordHash; return rest; });
  if (q) { const n = q.toLowerCase(); rows = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(n)); }
  return rows;
}

async function audit(userId: string, action: string, resource: string, refId: string | null, summary: string) {
  await db.insert(schema.auditLog).values({ userId, action, resource, refId, summary: summary.slice(0, 300) });
}

export async function createResource(key: string, input: unknown, userId: string) {
  const def = RESOURCES[key];
  if (!def || !def.create) throw notFound("منبع");
  let data: any = zodFor(def.fields, false, "create").parse(input);
  if (key === "users") {
    const idf = identifier.parse(data.identifier);
    const [ex] = await db.select({ id: schema.users.id }).from(schema.users).where(idf.includes("@") ? eq(schema.users.email, idf) : eq(schema.users.phone, idf));
    if (ex) throw new ApiError(409, "conflict", "این ایمیل/شماره قبلاً ثبت شده.");
    if (data.password.length < 8) throw new ApiError(422, "validation", "رمز عبور حداقل ۸ نویسه باشد.", { password: "رمز عبور حداقل ۸ نویسه باشد." });
    const [u] = await db.insert(schema.users).values({ displayName: data.displayName, role: data.role, email: idf.includes("@") ? idf : null, phone: idf.includes("@") ? null : idf, passwordHash: await hashPassword(data.password), approved: data.approved ?? true, disabled: data.disabled ?? false }).returning();
    if (u.role === "student") await db.insert(schema.studentProfiles).values({ userId: u.id, linkCode: u.id.replace(/-/g, "").slice(0, 6).toUpperCase() });
    await audit(userId, "create", key, u.id, u.displayName);
    return { id: u.id };
  }
  if (def.beforeSave) data = await def.beforeSave(data);
  data = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, k === "courseId" ? emptyToUndef(v) : v]));
  const cols = columns(def);
  data = Object.fromEntries(Object.entries(data).filter(([k]) => cols.has(k)));
  const [row] = await db.insert(def.table).values(data).returning();
  await audit(userId, "create", key, (row as any).id, def.label(row));
  return row;
}

export async function updateResource(key: string, id: string, input: unknown, userId: string) {
  const def = RESOURCES[key];
  if (!def) throw notFound("منبع");
  let data: any = zodFor(def.fields, true, "update").parse(input);
  const cols = columns(def);
  data = Object.fromEntries(Object.entries(data).filter(([k, v]) => cols.has(k) && v !== undefined));
  if (key === "users") {
    if (id === userId && (data.role && data.role !== "admin" || data.disabled)) throw new ApiError(409, "self", "نمی‌تونی نقش یا دسترسی خودت رو پایین بیاری.");
    if (data.disabled) await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
  }
  if (!Object.keys(data).length) return { id };
  const [row] = await db.update(def.table).set(data).where(eq((def.table as any).id, id)).returning();
  if (!row) throw notFound("مورد");
  await audit(userId, "update", key, id, def.label(row));
  return row;
}

export async function removeResource(key: string, id: string, userId: string) {
  const def = RESOURCES[key];
  if (!def || !def.remove) throw notFound("منبع");
  if (key === "users" && id === userId) throw new ApiError(409, "self", "نمی‌تونی حساب خودت رو حذف کنی.");
  const [row] = await db.delete(def.table).where(eq((def.table as any).id, id)).returning();
  if (!row) throw notFound("مورد");
  await audit(userId, "delete", key, id, def.label(row));
  return { deleted: true };
}

export const recentAudit = () => db.select({ id: schema.auditLog.id, action: schema.auditLog.action, resource: schema.auditLog.resource, summary: schema.auditLog.summary, at: schema.auditLog.createdAt, user: schema.users.displayName }).from(schema.auditLog).leftJoin(schema.users, eq(schema.users.id, schema.auditLog.userId)).orderBy(desc(schema.auditLog.createdAt)).limit(100);
void or; void ilike; void sql; type _S = SQL;
