/** Idempotent seed: public content straight from the documents + sample learning content + (optional) demo accounts. */
import { eq } from "drizzle-orm";
import { db, schema } from "../lib/server/db/client";
import { hashPassword } from "../lib/server/auth/password";

const A = "/assets/konjed";
const demo = process.argv.includes("--demo");

async function upsertUser(role: "student" | "coach" | "parent" | "admin", name: string, email: string | null, password: string | null, age?: number) {
  const [ex] = email ? await db.select().from(schema.users).where(eq(schema.users.email, email)) : [];
  if (ex) return ex;
  const [u] = await db.insert(schema.users).values({ role, displayName: name, email, passwordHash: await hashPassword(password ?? crypto.randomUUID() + crypto.randomUUID()), birthYear: age ? new Date().getFullYear() - age : null }).returning();
  if (role === "student") await db.insert(schema.studentProfiles).values({ userId: u.id, linkCode: u.id.replace(/-/g, "").slice(0, 6).toUpperCase() }).onConflictDoNothing();
  return u;
}

// ───────── arcade ─────────
const games: (typeof schema.games.$inferInsert)[] = [
  { slug: "money", title: "مدیریت پول", shortText: "چقدر از پولت رو خرج می‌کنی؟ چقدر پس‌انداز؟ و اگر یک اتفاق غیرمنتظره بیفته، چه تصمیمی می‌گیری؟", cover: `${A}/arcade/game-sea-island.webp`, accent: "#FFC83D", skillGroup: "finance", skillLabel: "سواد مالی", genre: "ماموریت پولی", ageMin: 13, ageMax: 15, minutes: 10, priceModel: "free", tags: ["منتخب کنجد"], featured: true, playUrl: null },
  { slug: "problem", title: "چالش حل مسئله", shortText: "یک مسئله، چند راه‌حل و کلی انتخاب. ببین می‌تونی بهترین مسیر رو پیدا کنی؟", cover: `${A}/arcade/game-puzzle-grid.webp`, accent: "#4CC2FF", skillGroup: "soft", skillLabel: "تفکر و حل مسئله", tags: ["منتخب کنجد"], featured: true },
  { slug: "idea", title: "ایده تا اجرا", shortText: "ایده‌ای داری؟ حالا وقتشه ببینی چطور می‌شه از یک ایده، یک پروژه واقعی ساخت.", cover: `${A}/arcade/game-space-explorer.webp`, accent: "#B58CFF", skillGroup: "entrepreneurship", skillLabel: "خلاقیت و کارآفرینی", tags: ["منتخب کنجد"], featured: true },
  { slug: "decide", title: "بازی تصمیم‌گیری", shortText: "در این بازی باید بین موقعیت‌های مختلف تصمیم بگیری و ببینی انتخاب‌هات چه نتیجه‌ای به همراه دارند.", cover: `${A}/arcade/game-valley-landscape.webp`, accent: "#5EE6A8", skillGroup: "soft", skillLabel: "تصمیم‌گیری", ageMin: 13, ageMax: 17, minutes: 10, priceModel: "free", tags: ["محبوب", "رایگان"], playsCount: 120 },
  { slug: "business", title: "اگر قرار بود یک کسب‌وکار راه بندازی، از کجا شروع می‌کردی؟", shortText: "در این بازی باید یک نیاز رو پیدا کنی، براش راه‌حل بسازی و تصمیم بگیری چطور ایده‌ات را اجرا کنی.", cover: `${A}/arcade/game-house-island.webp`, accent: "#FF8A5C", skillGroup: "entrepreneurship", skillLabel: "کارآفرینی", ageMin: 14, ageMax: 17, minutes: 15, tags: ["جدید"] },
];

// ───────── badges (from «دستاوردها و نشان‌ها») ─────────
const badges: (typeof schema.badges.$inferInsert)[] = [
  { code: "problem-solver", title: "نشان حل مسئله", description: "۳ مأموریت حل مسئله را با موفقیت کامل کردی.", icon: "badgeStar", rule: { type: "missions_in_skill", skill: "حل مسئله", count: 3 }, skillGroup: "soft" },
  { code: "decision-maker", title: "نشان تصمیم‌گیرنده", description: "۵ چالش تصمیم‌گیری را کامل کردی.", icon: "badgePurple", rule: { type: "missions_in_skill", skill: "تصمیم‌گیری", count: 5 }, skillGroup: "soft" },
  { code: "teammate", title: "نشان هم‌تیمی", description: "در ۳ پروژه گروهی مشارکت کردی.", icon: "medalBlue", rule: { type: "group_projects", count: 3 }, skillGroup: "soft" },
  { code: "creator", title: "نشان خالق", description: "۳ پروژه خلاقانه ساختی.", icon: "crown", rule: { type: "projects", count: 3 }, skillGroup: "soft" },
  { code: "entrepreneur", title: "نشان کارآفرین", description: "اولین ایده کسب‌وکارت را ثبت کردی.", icon: "medalPurple", rule: { type: "projects_in_skill", skill: "کارآفرینی", count: 1 }, skillGroup: "entrepreneurship" },
  { code: "explorer", title: "نشان کاوشگر", description: "۳ بازی جدید را تجربه کن.", icon: "crystal", rule: { type: "games_played", count: 3 } },
  { code: "mission-master", title: "نشان استاد مأموریت", description: "۱۰ مأموریت را کامل کن.", icon: "scroll", rule: { type: "missions_total", count: 10 } },
  { code: "maker", title: "نشان سازنده", description: "یک پروژه جدید در ویترین منتشر کن.", icon: "backpack", rule: { type: "projects", count: 1 } },
  { code: "challenger", title: "نشان چالشگر", description: "یک چالش هفتگی را کامل کن.", icon: "trophy", rule: { type: "challenges", count: 1 } },
];

const challenges: (typeof schema.challenges.$inferInsert)[] = [
  { slug: "big-idea", title: "چالش «ایده بزرگ من»", description: "یک ایده برای حل یک مشکل واقعی پیدا کن و در چند جمله توضیح بده چطور می‌تونی اون رو به یک راه‌حل تبدیل کنی.", skill: "خلاقیت و کارآفرینی", deadlineLabel: "۱۵ آبان", status: "active", points: 120, coins: 12, badgeCode: "challenger" },
  { slug: "smart-week", title: "چالش «یک هفته هوشمندانه»", description: "در طول یک هفته، یکی از عادت‌های روزمره‌ات رو بررسی کن و یک راه ساده برای بهتر کردنش پیدا کن.", skill: "مدیریت زمان و تصمیم‌گیری", deadlineLabel: "۲۰ آبان", status: "active", points: 100, coins: 10 },
  { slug: "problem-hero", title: "مسابقه «قهرمان حل مسئله»", description: "یک مسئله واقعی رو انتخاب کن، راه‌حل خودت رو ارائه بده و ببین ایده‌ات چقدر می‌تونه کاربردی باشه.", skill: "حل مسئله", kind: "contest", deadlineLabel: "به‌زودی", status: "upcoming", points: 200, coins: 20 },
];

// ───────── learning content (sample; authored for this build, not from the documents) ─────────
const missionsSpec = [
  { stage: 1, position: 1, title: "مسئله‌ات رو بشناس", skill: "حل مسئله", description: "قبل از اینکه دنبال راه‌حل بگردی، باید مسئله رو دقیق بشناسی.", instruction: "یک مسئله واقعی از اطراف خودت انتخاب کن و بنویس: مسئله دقیقاً چیه؟ چه کسی درگیرشه؟ چرا مهمه؟", contentSummary: "شناخت مسئله پیش از راه‌حل؛ تعریف مسئله، افراد درگیر، دلیل اهمیت، ریشه‌یابی، پرسیدن چرا چند بار", minutes: 15, points: 60, coins: 6 },
  { stage: 1, position: 2, title: "ایده‌پردازی سریع", skill: "خلاقیت", description: "کمیت ایده‌ها به کیفیت می‌رسه.", instruction: "برای مسئله‌ات حداقل ۵ ایده مختلف بنویس؛ حتی ایده‌های عجیب. بعد بگو کدوم رو بیشتر دوست داری و چرا.", contentSummary: "طوفان فکری؛ تولید ایده‌های زیاد بدون قضاوت؛ ترکیب ایده‌ها؛ انتخاب ایده بر اساس معیار", minutes: 15, points: 60, coins: 6 },
  { stage: 2, position: 1, title: "انتخاب بهترین راه‌حل", skill: "تصمیم‌گیری", description: "از بین چند راه‌حل، با معیار انتخاب کن.", instruction: "سه راه‌حل رو با ۳ معیار (هزینه، زمان، اثر) مقایسه کن و تصمیم نهایی‌ات رو با دلیل بنویس.", contentSummary: "تصمیم‌گیری با معیار؛ مقایسه گزینه‌ها؛ هزینه زمان اثر؛ مزایا و معایب؛ دلیل انتخاب", minutes: 20, points: 70, coins: 7 },
  { stage: 2, position: 2, title: "کار تیمی در عمل", skill: "کار تیمی", description: "تقسیم نقش‌ها یعنی نصف موفقیت.", instruction: "یک کار گروهی رو که اخیراً انجام دادی توضیح بده: نقش هر نفر چی بود و چه چیزی رو دفعه بعد بهتر انجام می‌دی؟", contentSummary: "کار تیمی؛ تقسیم نقش؛ ارتباط مؤثر؛ گوش دادن؛ مسئولیت‌پذیری؛ بازخورد به هم‌تیمی", minutes: 15, points: 70, coins: 7 },
  { stage: 3, position: 1, title: "نمونه اولیه بساز", skill: "حل مسئله", description: "ایده‌ات رو به یک نمونه ساده تبدیل کن.", instruction: "نمونه اولیه راه‌حلت رو (یک طرح، نقشه یا چک‌لیست) توضیح بده و بگو چطور آزمایشش می‌کنی.", contentSummary: "نمونه اولیه؛ آزمایش ایده؛ بازخورد کاربر؛ بهبود تدریجی؛ ساده شروع کردن", minutes: 25, points: 80, coins: 8 },
];
const globalMissions = [
  { stage: 1, position: 1, title: "اولین بودجه‌ات", skill: "مدیریت پول", description: "یک بودجه‌ی ساده برای یک ماه بساز.", instruction: "فرض کن ماهی ۵۰۰ هزار تومان داری. بنویس چقدر خرج، چقدر پس‌انداز و چقدر برای اتفاق غیرمنتظره کنار می‌ذاری و چرا.", contentSummary: "بودجه‌بندی؛ درآمد و هزینه؛ پس‌انداز؛ صندوق اضطراری؛ نیاز در برابر خواسته", minutes: 15, points: 60, coins: 6 },
  { stage: 1, position: 2, title: "ایده تا اجرا — قدم اول", skill: "ایده‌پردازی", description: "یک مشکل پیدا کن و یک ایده کوچک بساز.", instruction: "یک مشکل کوچک در محله یا مدرسه‌ات پیدا کن و یک ایده برای حلش بنویس. مشتری ایده‌ات کیه؟", contentSummary: "شناخت مسئله؛ شناخت مشتری؛ ایده‌پردازی؛ نیاز؛ ارزش ایده", minutes: 15, points: 60, coins: 6 },
];

const toolbox: (typeof schema.toolboxItems.$inferInsert)[] = [
  { title: "چک‌لیست تصمیم‌گیری", kind: "checklist", skillGroup: "soft", body: "۱) مسئله رو یک جمله بنویس. ۲) حداقل سه گزینه پیدا کن. ۳) برای هر گزینه مزایا و معایب بنویس. ۴) سه معیار مهم انتخاب کن. ۵) تصمیم بگیر و یک هفته بعد نتیجه رو بررسی کن." },
  { title: "تمرین پنج چرا", kind: "exercise", skillGroup: "soft", body: "برای یک مسئله پنج بار پشت سر هم بپرس «چرا؟». جواب آخر معمولاً ریشه‌ی واقعی مسئله‌ست." },
  { title: "قالب بودجه ماهانه", kind: "template", skillGroup: "finance", body: "درآمد: ___ | نیازها: ___ | خواسته‌ها: ___ | پس‌انداز: ___ | صندوق اضطراری: ___" },
  { title: "قانون ۵۰/۳۰/۲۰", kind: "tool", skillGroup: "finance", body: "۵۰٪ نیازها، ۳۰٪ خواسته‌ها، ۲۰٪ پس‌انداز. عددها رو با شرایط خودت تنظیم کن." },
  { title: "بوم ساده ایده", kind: "template", skillGroup: "entrepreneurship", body: "مشکل چیه؟ برای چه کسی؟ راه‌حل من چیه؟ چرا بهتر از روش فعلیه؟ اولین قدم فردا چیه؟" },
  { title: "فعالیت: یک ایده، ده نفر", kind: "activity", skillGroup: "entrepreneurship", body: "ایده‌ات رو به ده نفر بگو و از هر کدوم یک پیشنهاد برای بهتر شدنش بگیر." },
];

const showcase = [
  { author: "آریا", title: "یک هفته بدون خرید اضافه", description: "آریا تصمیم گرفته بود یک هفته خرج‌های غیرضروری خودش رو ثبت کنه و ببینه چقدر می‌تونه بهتر برای پولش برنامه‌ریزی کنه. دستاورد: ساخت یک برنامه ساده برای مدیریت هزینه‌ها.", skill: "مدیریت پول", kind: "individual" as const, likes: 18, featured: true },
  { author: "سام", title: "اپلیکیشن خیالی من", description: "یک ایده برای یک اپلیکیشن که قرار است یک مشکل واقعی را حل کند.", skill: "ایده‌پردازی", kind: "idea" as const, likes: 9 },
  { author: "محمد", title: "فروشگاه کوچک من", description: "یک ایده ساده برای راه‌اندازی یک فروشگاه کوچک و بررسی اینکه چه چیزی باعث می‌شود مشتری‌ها از آن خرید کنند.", skill: "کارآفرینی", kind: "individual" as const, likes: 12 },
];

async function main() {
  for (const g of games) await db.insert(schema.games).values(g).onConflictDoNothing();
  for (const b of badges) await db.insert(schema.badges).values(b).onConflictDoNothing();
  for (const c of challenges) await db.insert(schema.challenges).values(c).onConflictDoNothing();
  if (!(await db.select().from(schema.toolboxItems).limit(1)).length) await db.insert(schema.toolboxItems).values(toolbox);

  const [course] = await db.insert(schema.courses).values({ slug: "creativity-problem-solving", title: "مهارت‌های خلاقیت و حل مسئله", description: "با مأموریت، چالش و پروژه یاد می‌گیری چطور مسئله‌ها رو بشناسی، ایده بسازی و بهترین راه‌حل رو انتخاب کنی.", category: "soft", skills: ["خلاقیت", "حل مسئله", "کار تیمی"], ageMin: 12, ageMax: 15, status: "registering", capacity: 20, featured: true }).onConflictDoNothing().returning();
  const courseRow = course ?? (await db.select().from(schema.courses).where(eq(schema.courses.slug, "creativity-problem-solving")))[0];
  if (!(await db.select().from(schema.missions).limit(1)).length) {
    await db.insert(schema.missions).values(missionsSpec.map((m) => ({ ...m, courseId: courseRow.id })));
    await db.insert(schema.missions).values(globalMissions.map((m) => ({ ...m, courseId: null })));
  }

  const authors: Record<string, string> = {};
  for (const s of showcase) authors[s.author] = (await upsertUser("student", s.author, `${s.author}.seed@konjed.local`, null, 14)).id;
  if (!(await db.select().from(schema.projects).limit(1)).length)
    for (const s of showcase) await db.insert(schema.projects).values({ authorId: authors[s.author], title: s.title, description: s.description, skill: s.skill, kind: s.kind, likesCount: s.likes, featured: !!s.featured });

  const adminEmail = process.env.ADMIN_EMAIL, adminPw = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPw) await upsertUser("admin", "مدیر کنجد", adminEmail, adminPw);
  if (demo) {
    const st = await upsertUser("student", "نیلوفر", "student@demo.konjed", "demo12345", 14);
    const co = await upsertUser("coach", "مربی رضایی", "coach@demo.konjed", "demo12345");
    const pa = await upsertUser("parent", "پدر نیلوفر", "parent@demo.konjed", "demo12345");
    await upsertUser("admin", "مدیر دمو", "admin@demo.konjed", "demo12345");
    await db.insert(schema.enrollments).values({ courseId: courseRow.id, studentId: st.id }).onConflictDoNothing();
    const [cls] = (await db.select().from(schema.classes).where(eq(schema.classes.coachId, co.id))).length ? await db.select().from(schema.classes).where(eq(schema.classes.coachId, co.id)) : await db.insert(schema.classes).values({ courseId: courseRow.id, coachId: co.id, name: "کلاس خلاقیت — گروه الف", schedule: "جمعه‌ها ۱۷:۰۰" }).returning();
    await db.update(schema.enrollments).set({ classId: cls.id }).where(eq(schema.enrollments.studentId, st.id));
    await db.insert(schema.parentLinks).values({ parentId: pa.id, studentId: st.id }).onConflictDoNothing();
    console.log("demo accounts: student@demo.konjed / coach@demo.konjed / parent@demo.konjed / admin@demo.konjed  (password demo12345)");
  }
  console.log("seeded");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
