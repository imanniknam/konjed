import { z } from "zod";

const fa = "۰۱۲۳۴۵۶۷۸۹", ar = "٠١٢٣٤٥٦٧٨٩";
export const latinDigits = (s: string) => s.replace(/[۰-۹]/g, (d) => String(fa.indexOf(d))).replace(/[٠-٩]/g, (d) => String(ar.indexOf(d)));

const text = (min: number, max: number, label: string) =>
  z.string({ error: `${label} را وارد کن.` }).trim().min(min, `${label} خیلی کوتاه است.`).max(max, `${label} خیلی بلند است.`);
const optText = (max: number) => z.string().trim().max(max, "متن خیلی بلند است.").optional().or(z.literal("").transform(() => undefined));

/** Iranian mobile (09xxxxxxxxx) or an email address. */
export const identifier = z.string({ error: "ایمیل یا شماره موبایل را وارد کن." }).trim().transform(latinDigits).superRefine((v, ctx) => {
  if (!(/^09\d{9}$/.test(v) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) ctx.addIssue({ code: "custom", message: "ایمیل یا شماره موبایل معتبر وارد کن (مثلاً 09123456789)." });
}).transform((v) => v.toLowerCase());

export const registerSchema = z.object({
  role: z.enum(["student", "coach", "parent"], { error: "نقش را انتخاب کن." }),
  displayName: text(2, 60, "نام"),
  identifier,
  password: z.string({ error: "رمز عبور را وارد کن." }).min(8, "رمز عبور حداقل ۸ نویسه باشد.").max(100),
  age: z.coerce.number().int().min(10, "سن باید بین ۱۰ تا ۱۹ باشد.").max(19, "سن باید بین ۱۰ تا ۱۹ باشد.").optional(),
});
export const loginSchema = z.object({ identifier, password: z.string().min(1, "رمز عبور را وارد کن.") });

export const contactSchema = z.object({
  name: text(2, 120, "نام"), email: z.string().trim().email("ایمیل معتبر نیست.").optional().or(z.literal("").transform(() => undefined)),
  phone: optText(30), subject: optText(80), message: text(5, 3000, "متن پیام"),
});
export const collabSchema = z.object({
  name: text(2, 120, "نام"), org: optText(160), type: optText(80), phone: optText(30),
  email: z.string().trim().email("ایمیل معتبر نیست.").optional().or(z.literal("").transform(() => undefined)),
  description: optText(3000), link: optText(300),
});
export const gameSubmissionSchema = z.object({
  name: text(2, 200, "نام بازی"), summary: optText(2000), skill: optText(60), related: optText(300), age: optText(40),
  duration: optText(40), kind: optText(40), price: optText(20), link: optText(400), maker: optText(120), contact: optText(200),
});
export const projectSchema = z.object({
  title: text(2, 200, "عنوان پروژه"), desc: optText(5000), skill: optText(80),
  type: z.enum(["فردی", "گروهی", "تجربه یادگیری", "ایده خلاقانه"]).optional(),
  coverUrl: optText(400), fileUrl: optText(400),
});
export const commentSchema = z.object({ body: text(2, 1000, "نظر") });
export const missionSubmitSchema = z.object({ text: text(10, 6000, "پاسخ"), mediaUrl: optText(400), mediaKind: z.enum(["audio", "video"]).optional() });
export const reviewSchema = z.object({
  action: z.enum(["approve", "adjust"]), score: z.coerce.number().int().min(0).max(100).optional(), feedback: optText(2000),
});
export const classSchema = z.object({ courseId: z.string().uuid(), name: text(2, 120, "نام کلاس"), schedule: optText(200) });
export const attendanceSchema = z.object({
  title: text(2, 120, "عنوان جلسه"),
  records: z.array(z.object({ studentId: z.string().uuid(), status: z.enum(["present", "absent", "late"]), note: optText(300) })).min(1),
});
export const activateChallengeSchema = z.object({ challengeId: z.string().uuid(), classId: z.string().uuid(), startsAt: z.string().optional(), endsAt: z.string().optional() });
export const linkChildSchema = z.object({ code: z.string().trim().min(4, "کد را درست وارد کن.").max(12).transform((s) => latinDigits(s).toUpperCase()) });
export const profileSchema = z.object({ displayName: text(2, 60, "نام").optional(), avatar: optText(400) });
export const passwordSchema = z.object({ current: z.string().min(1), next: z.string().min(8, "رمز جدید حداقل ۸ نویسه باشد.").max(100) });
export const challengeEntrySchema = z.object({ text: text(5, 4000, "پاسخ"), projectId: z.string().uuid().optional() });
export const gamesQuery = z.object({
  q: z.string().trim().max(80).optional(), group: z.enum(["soft", "finance", "entrepreneurship"]).optional(),
  sort: z.enum(["recommended", "newest", "popular", "alpha"]).default("recommended"),
  age: z.enum(["13-14", "15-17"]).optional(), duration: z.enum(["short", "medium"]).optional(), price: z.enum(["free", "paid"]).optional(),
  limit: z.coerce.number().int().min(1).max(60).default(40),
});
export const projectsQuery = z.object({
  q: z.string().trim().max(80).optional(), kind: z.enum(["individual", "group", "learning_experience", "idea"]).optional(),
  sort: z.enum(["newest", "popular"]).default("newest"), group: z.enum(["soft", "finance", "entrepreneurship"]).optional(), limit: z.coerce.number().int().min(1).max(60).default(30),
});
