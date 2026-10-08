import { ASSETS } from "./assetMap";

/** All user-facing copy lives here (Persian). Terminology follows the project documents. */

export type NavChild = { label: string; href: string; note?: string };
export type NavItem = { label: string; href: string; children?: NavChild[] };

export const NAV: NavItem[] = [
  {
    label: "بازی‌ها",
    href: "/games",
    children: [
      { label: "همه بازی‌ها", href: "/games" },
      { label: "بازی بر اساس مهارت", href: "/games/skills" },
      { label: "بازی‌های محبوب و جدید", href: "/games/popular" },
      { label: "انتشار بازی", href: "/games/publish", note: "فاز ۲" },
    ],
  },
  { label: "مدرسه مهارت", href: "/courses" },
  {
    label: "ویترین مهارت‌آموزها",
    href: "/showcase",
    children: [
      { label: "گالری پروژه‌ها", href: "/showcase/gallery" },
      { label: "دستاوردها و نشان‌ها", href: "/showcase/achievements" },
      { label: "چالش‌ها و مسابقات", href: "/showcase/challenges", note: "فاز ۳" },
    ],
  },
  {
    label: "درباره کنجد",
    href: "/about",
    children: [
      { label: "داستان کنجد", href: "/about/story" },
      { label: "روش یادگیری", href: "/about/method" },
      { label: "همکاری با کنجد", href: "/about/partnership" },
      { label: "ارتباط با ما", href: "/about/contact" },
    ],
  },
];

export const AUTH = { label: "ورود / ثبت‌نام", href: "/login" };
export const PRIMARY_CTA = { label: "شروع ماجراجویی", href: "/signup" };

export const HERO = {
  title: ["مهارت‌های زندگی رو", "بازی کن!"],
  lead: "اینجا قرار نیست فقط چیزی یاد بگیری؛ بازی می‌کنی، انتخاب می‌کنی، اشتباه می‌کنی، تجربه می‌کنی و کم‌کم مهارت‌هایی می‌سازی که توی دنیای واقعی به کارت میان.",
  primary: PRIMARY_CTA,
  secondary: { label: "کشف دوره‌ها", href: "/courses" },
  micro: ["بازی‌های مهارتی", "چالش‌های واقعی", "پروژه‌های خلاقانه"],
  scrollHint: "اسکرول کن",
};

export type GameCardData = {
  id: string;
  index: string;
  title: string;
  text: string;
  skill: string;
  cta: string;
  image: string;
  accent: string;
  href: string;
  prop: string;
};

export const ARCADE = {
  eyebrow: "کنجد آرکید",
  title: "بازی کن، مهارت یاد بگیر!",
  lead: "بعضی چیزها رو نمی‌شه فقط با خوندن یاد گرفت. باید وارد بازی بشی، تصمیم بگیری و ببینی انتخابت چه نتیجه‌ای داره.",
  body: "در کنجد آرکید، بازی‌هایی منتظرته که هم سرگرمت می‌کنن و هم مهارت‌هایی مثل حل مسئله، تصمیم‌گیری، سواد مالی و کارآفرینی رو تقویت می‌کنن.",
  cta: { label: "همه بازی‌ها", href: "/games" },
  games: [
    {
      id: "money",
      index: "۰۱",
      title: "مدیریت پول",
      text: "چقدر از پولت رو خرج می‌کنی؟ چقدر پس‌انداز؟ و اگر یک اتفاق غیرمنتظره بیفته، چه تصمیمی می‌گیری؟",
      skill: "سواد مالی",
      cta: "شروع بازی",
      image: ASSETS.arcade.gameMoney,
      accent: "#FFC83D",
      href: "/games/money",
      prop: ASSETS.rewards.coin,
    },
    {
      id: "problem",
      index: "۰۲",
      title: "چالش حل مسئله",
      text: "یک مسئله، چند راه‌حل و کلی انتخاب. ببین می‌تونی بهترین مسیر رو پیدا کنی؟",
      skill: "تفکر و حل مسئله",
      cta: "شروع بازی",
      image: ASSETS.arcade.gameProblem,
      accent: "#4CC2FF",
      href: "/games/problem",
      prop: ASSETS.rewards.crystal,
    },
    {
      id: "idea",
      index: "۰۳",
      title: "ایده تا اجرا",
      text: "ایده‌ای داری؟ حالا وقتشه ببینی چطور می‌شه از یک ایده، یک پروژه واقعی ساخت.",
      skill: "خلاقیت و کارآفرینی",
      cta: "شروع بازی",
      image: ASSETS.arcade.gameIdea,
      accent: "#B58CFF",
      href: "/games/idea",
      prop: ASSETS.rewards.bulb,
    },
  ] satisfies GameCardData[],
};

export const SCHOOL = {
  eyebrow: "مدرسه مهارت",
  title: "از بازی تا مهارت‌های واقعی زندگی",
  lead: "بازی شروع ماجراست؛ اما قرار نیست ماجرا همین‌جا تمام شود.",
  body: "در همکاری مدرسه مهارت و کنجد، با کمک مربی، وارد چالش‌ها و پروژه‌های واقعی می‌شی، چیزهای جدید امتحان می‌کنی و مهارت‌هایی رو تمرین می‌کنی که فقط به درد کلاس نمی‌خورن؛ به درد زندگی می‌خورن.",
  primary: { label: "مشاهده دوره‌ها", href: "/courses" },
  secondary: { label: "آشنایی با مدرسه مهارت", href: "/courses#about" },
  featuredLabel: "دوره‌های منتخب",
  course: {
    title: "مهارت‌های خلاقیت و حل مسئله",
    skills: ["خلاقیت", "حل مسئله", "کار تیمی"],
    age: "۱۲ تا ۱۵ سال",
    status: "ثبت‌نام فعال",
    cta: "جزئیات دوره",
    href: "/courses#registering",
  },
};

export type ProjectData = {
  id: string;
  title: string;
  maker: string;
  tag: string;
  blurb: string;
  prop: string;
  hue: string;
};

export const SHOWCASE = {
  eyebrow: "ویترین مهارت‌آموزها",
  title: "ایده‌هات رو فقط توی ذهنت نگه ندار!",
  lead: "اینجا پروژه‌هایی رو می‌بینی که مهارت‌آموزهای کنجد ساخته‌اند؛ از ایده‌های خلاقانه و طراحی گرفته تا پروژه‌های کسب‌وکار و تجربه‌های شخصی.",
  closing: "شاید پروژه بعدی، مال تو باشه.",
  cta: { label: "دیدن همه پروژه‌ها", href: "/showcase/gallery" },
  makerPrefix: "ساخته‌شده توسط",
  viewLabel: "مشاهده پروژه",
  /** Sample cards: first three come from the documents, the rest from the approved design reference. */
  projects: [
    { id: "p1", title: "یک هفته بدون خرید اضافه", maker: "آریا", tag: "سواد مالی", blurb: "ثبت خرج‌های غیرضروری یک هفته و ساخت یک برنامه ساده برای مدیریت هزینه‌ها.", prop: ASSETS.rewards.coin, hue: "#FFB400" },
    { id: "p2", title: "اپلیکیشن خیالی من", maker: "سام", tag: "ایده محصول", blurb: "ایده‌ای برای یک اپلیکیشن که قرار است یک مشکل واقعی رو حل کنه.", prop: ASSETS.rewards.tablet, hue: "#4CC2FF" },
    { id: "p3", title: "فروشگاه کوچک من", maker: "محمد", tag: "کارآفرینی", blurb: "بررسی اینکه چه چیزی باعث می‌شه مشتری‌ها از یک فروشگاه کوچک خرید کنن.", prop: ASSETS.rewards.chestWood, hue: "#7BE08A" },
    { id: "p4", title: "اپلیکیشن مدیریت زمان", maker: "نمایش نمونه", tag: "طراحی", blurb: "طراحی یک تجربه ساده برای برنامه‌ریزی روزانه نوجوان‌ها.", prop: ASSETS.rewards.potion, hue: "#B58CFF" },
    { id: "p5", title: "کارگاه برندسازی", maker: "نمایش نمونه", tag: "کسب‌وکار", blurb: "ساخت هویت یک برند خیالی؛ از اسم تا رنگ و لوگو.", prop: ASSETS.rewards.camera, hue: "#FF8A5C" },
  ] satisfies ProjectData[],
};

export const JOURNEY = {
  eyebrow: "کنجد چطور کار می‌کند؟",
  title: "ماجراجویی توی کنجد چطوریه؟",
  lead: "اینجا قرار نیست فقط یک عالمه درس و تمرین پشت سر هم داشته باشی. مسیرت رو با بازی، مأموریت و تجربه واقعی جلو می‌بری.",
  closing: "یادگیری وقتی جذاب‌تره که خودت قهرمان داستان باشی.",
  steps: [
    { n: "۱", title: "بازی کن", text: "با بازی‌ها و چالش‌های مهارتی وارد ماجرا شو.", art: ASSETS.rewards.controller },
    { n: "۲", title: "مأموریت انجام بده", text: "چالش‌ها رو پشت سر بذار و جلو برو.", art: ASSETS.school.map },
    { n: "۳", title: "امتیاز و دستاورد بگیر", text: "برای فعالیت‌ها و پیشرفتت امتیاز و دستاورد کسب کن.", art: ASSETS.rewards.trophy },
    { n: "۴", title: "چیزی بساز", text: "مهارتت رو در یک پروژه واقعی امتحان کن و نتیجه‌اش رو به دیگران نشون بده.", art: ASSETS.rewards.backpack },
  ],
};

export const FINAL = {
  title: "آماده‌ای وارد بازی بشی؟",
  lines: ["بازی کن.", "تجربه کن.", "مهارت یاد بگیر.", "و چیزی بساز که واقعاً مال خودت باشه."],
  cta: PRIMARY_CTA,
  micro: "از همین‌جا شروع کن؛ اولین مأموریتت منتظرته.",
};

export const FOOTER = {
  brandLine: "سکوی گیمیفیکیشن و ویترین بازی‌های آموزشی",
  columns: [
    { title: "کنجد", links: [{ label: "درباره کنجد", href: "/about" }, { label: "روش یادگیری", href: "/about/method" }, { label: "ارتباط با ما", href: "/about/contact" }] },
    { title: "بازی‌ها", links: [{ label: "همه بازی‌ها", href: "/games" }, { label: "دسته‌بندی بازی‌ها", href: "/games/skills" }] },
    { title: "مدرسه مهارت", links: [{ label: "همه دوره‌ها", href: "/courses" }] },
    { title: "دسترسی سریع", links: [{ label: "ورود", href: "/login" }, { label: "ثبت‌نام", href: "/signup" }, { label: "پنل کاربری", href: "/panel" }] },
    { title: "قوانین و پشتیبانی", links: [{ label: "قوانین استفاده", href: "/terms" }, { label: "حریم خصوصی", href: "/privacy" }, { label: "پرسش‌های متداول", href: "/faq" }, { label: "پشتیبانی", href: "/support" }] },
  ],
  rights: "© کنجد؛ همه حقوق محفوظ است.",
};

export const LOADER = { name: "کنجد", line: "در حال آماده‌سازی ماجراجویی..." };

/* ───────── CMS defaults (what the admin can override) ───────── */
export const HOME_DEFAULT = {
  hero: HERO,
  arcade: { eyebrow: ARCADE.eyebrow, title: ARCADE.title, lead: ARCADE.lead, body: ARCADE.body, cta: ARCADE.cta },
  school: { eyebrow: SCHOOL.eyebrow, title: SCHOOL.title, lead: SCHOOL.lead, body: SCHOOL.body, primary: SCHOOL.primary, secondary: SCHOOL.secondary, featuredLabel: SCHOOL.featuredLabel, courseCta: "جزئیات دوره" },
  showcase: { eyebrow: SHOWCASE.eyebrow, title: SHOWCASE.title, lead: SHOWCASE.lead, closing: SHOWCASE.closing, cta: SHOWCASE.cta, makerPrefix: SHOWCASE.makerPrefix, viewLabel: SHOWCASE.viewLabel },
  journey: JOURNEY,
  final: FINAL,
};
export type HomeContent = typeof HOME_DEFAULT;

export const CHROME_DEFAULT = { nav: NAV, auth: AUTH, cta: PRIMARY_CTA, footer: FOOTER };
export type ChromeContent = typeof CHROME_DEFAULT;
