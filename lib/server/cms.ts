import { desc, eq } from "drizzle-orm";
import { CHROME_DEFAULT, HOME_DEFAULT } from "../konjed/content";
import { defaultPage, PAGE_SLUGS } from "../konjed/pages/registry";
import type { PageData } from "../konjed/pages/types";
import { db, schema } from "./db/client";
import { ApiError } from "./http/errors";

/**
 * Editable content. Every document has a code default; an admin override (DB) replaces it.
 * Keys: "home", "chrome", "page:<slug>".
 */
export const CMS_KEYS = ["home", "chrome", ...PAGE_SLUGS.map((s) => `page:${s}`)];
export const CMS_LABELS: Record<string, string> = {
  home: "صفحه اصلی (هیرو، آرکید، مدرسه مهارت، ویترین، «کنجد چطور کار می‌کند؟»، CTA نهایی)",
  chrome: "منو، دکمه‌های سرصفحه و فوتر",
};

export function cmsDefault(key: string): unknown {
  if (key === "home") return HOME_DEFAULT;
  if (key === "chrome") return CHROME_DEFAULT;
  if (key.startsWith("page:")) return defaultPage(key.slice(5));
  throw new ApiError(404, "no_doc", "سند محتوا پیدا نشد.");
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

async function stored(key: string) {
  const [r] = await db.select().from(schema.cmsDocuments).where(eq(schema.cmsDocuments.key, key));
  return r;
}

/** Group-level merge so a field added in code later still shows up for an older stored override. */
function merge(def: unknown, over: unknown): unknown {
  if (isObj(def) && isObj(over)) { const out: Record<string, unknown> = { ...def }; for (const k of Object.keys(over)) out[k] = k in def ? merge(def[k], over[k]) : over[k]; return out; }
  return over ?? def;
}

export async function getHome(): Promise<typeof HOME_DEFAULT> { const r = await stored("home").catch(() => undefined); return (r ? merge(HOME_DEFAULT, r.data) : HOME_DEFAULT) as typeof HOME_DEFAULT; }
export async function getChrome(): Promise<typeof CHROME_DEFAULT> { const r = await stored("chrome").catch(() => undefined); return (r ? merge(CHROME_DEFAULT, r.data) : CHROME_DEFAULT) as typeof CHROME_DEFAULT; }
export async function getPageDoc(slug: string): Promise<PageData | undefined> {
  const def = defaultPage(slug);
  if (!def) return undefined;
  const r = await stored(`page:${def.slug}`).catch(() => undefined);
  return (r ? { ...def, ...(r.data as object), slug: def.slug } : def) as PageData;
}

export async function effectiveDoc(key: string) {
  const r = await stored(key);
  return { data: r ? r.data : cmsDefault(key), customized: !!r, updatedAt: r?.updatedAt ?? null };
}

/* ───────── validation ───────── */
const SECTION_KINDS = new Set(["prose", "cards", "steps", "skills", "chips", "bullets", "faq", "form", "registeringCourses", "projectsFeed", "projectForm", "challengesLive", "achievementsLive", "mySubmissions", "stats", "gamesRow", "catalog", "soon", "emptyState", "cta"]);
const URL_KEYS = new Set(["href", "src", "art", "image", "cover", "coverUrl"]);
const safeUrl = (u: string) => u === "" || /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i.test(u);

function walk(v: unknown, path: string, depth = 0): void {
  if (depth > 12) throw new ApiError(422, "deep", "ساختار سند بیش از حد تو در تو است.");
  if (Array.isArray(v)) { if (v.length > 300) throw new ApiError(422, "big", `لیست «${path}» خیلی بلند است.`); v.forEach((x, i) => walk(x, `${path}[${i}]`, depth + 1)); return; }
  if (isObj(v)) { for (const [k, x] of Object.entries(v)) { if (URL_KEYS.has(k) && typeof x === "string" && !safeUrl(x)) throw new ApiError(422, "unsafe_url", `آدرس نامعتبر در «${path}.${k}» (فقط لینک داخلی یا http/https).`); walk(x, `${path}.${k}`, depth + 1); } return; }
  if (typeof v === "string" && v.length > 20_000) throw new ApiError(422, "long", `متن «${path}» خیلی بلند است.`);
}

function conforms(def: unknown, val: unknown, path: string) {
  if (typeof def === "string" && typeof val !== "string") throw new ApiError(422, "shape", `«${path}» باید متن باشد.`);
  if (typeof def === "number" && typeof val !== "number") throw new ApiError(422, "shape", `«${path}» باید عدد باشد.`);
  if (Array.isArray(def)) { if (!Array.isArray(val)) throw new ApiError(422, "shape", `«${path}» باید لیست باشد.`); return; }
  if (isObj(def)) {
    if (!isObj(val)) throw new ApiError(422, "shape", `«${path}» باید شیء باشد.`);
    for (const k of Object.keys(def)) { if (!(k in val)) throw new ApiError(422, "shape", `فیلد «${path}.${k}» حذف شده است.`); conforms(def[k], val[k], `${path}.${k}`); }
  }
}

function validate(key: string, data: unknown) {
  if (!isObj(data)) throw new ApiError(422, "shape", "سند باید یک شیء JSON باشد.");
  if (JSON.stringify(data).length > 300_000) throw new ApiError(422, "big", "حجم سند بیش از ۳۰۰ کیلوبایت است.");
  walk(data, key);
  if (key.startsWith("page:")) {
    const p = data as Partial<PageData>;
    if (!isObj(p.hero) || typeof p.hero.title !== "string" || !Array.isArray(p.hero.text) || !Array.isArray(p.hero.ctas)) throw new ApiError(422, "shape", "هیرو باید title و text (لیست) و ctas داشته باشد.");
    if (!Array.isArray(p.sections)) throw new ApiError(422, "shape", "sections باید لیست باشد.");
    p.sections.forEach((s, i) => { if (!isObj(s) || !SECTION_KINDS.has(String(s.kind))) throw new ApiError(422, "shape", `بخش ${i + 1}: نوع (kind) نامعتبر است.`); });
  } else conforms(cmsDefault(key), data, key);
}

export async function saveDoc(key: string, data: unknown, userId: string) {
  if (!CMS_KEYS.includes(key)) throw new ApiError(404, "no_doc", "سند محتوا پیدا نشد.");
  validate(key, data);
  await db.transaction(async (tx) => {
    const prev = await tx.select().from(schema.cmsDocuments).where(eq(schema.cmsDocuments.key, key));
    if (prev[0]) await tx.insert(schema.cmsRevisions).values({ key, data: prev[0].data, createdBy: prev[0].updatedBy });
    await tx.insert(schema.cmsDocuments).values({ key, data: data as object, updatedBy: userId }).onConflictDoUpdate({ target: schema.cmsDocuments.key, set: { data: data as object, updatedBy: userId, updatedAt: new Date() } });
  });
}
export async function resetDoc(key: string, userId: string) {
  const prev = await stored(key);
  if (prev) { await db.insert(schema.cmsRevisions).values({ key, data: prev.data, createdBy: userId }); await db.delete(schema.cmsDocuments).where(eq(schema.cmsDocuments.key, key)); }
}
export const revisions = (key: string) => db.select({ id: schema.cmsRevisions.id, createdAt: schema.cmsRevisions.createdAt }).from(schema.cmsRevisions).where(eq(schema.cmsRevisions.key, key)).orderBy(desc(schema.cmsRevisions.createdAt)).limit(20);
export async function revisionData(id: string) { const [r] = await db.select().from(schema.cmsRevisions).where(eq(schema.cmsRevisions.id, id)); return r; }
export async function listDocs() {
  const rows = await db.select({ key: schema.cmsDocuments.key, updatedAt: schema.cmsDocuments.updatedAt }).from(schema.cmsDocuments);
  const m = new Map(rows.map((r) => [r.key, r.updatedAt]));
  return CMS_KEYS.map((key) => ({ key, label: CMS_LABELS[key] ?? (defaultPage(key.slice(5))?.title ?? key), customized: m.has(key), updatedAt: m.get(key) ?? null }));
}
