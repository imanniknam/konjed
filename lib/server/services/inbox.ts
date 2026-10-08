import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/client";
import { notFound } from "../http/errors";
import { collabSchema, contactSchema, gameSubmissionSchema } from "../validation";
import { notify } from "./common";

export const createContact = async (i: z.infer<typeof contactSchema>) => { await db.insert(schema.contactMessages).values(i); return { received: true }; };
export const createCollab = async (i: z.infer<typeof collabSchema>) => { await db.insert(schema.collabRequests).values(i); return { received: true }; };

export async function createGameSubmission(userId: string | null, i: z.infer<typeof gameSubmissionSchema>) {
  const [s] = await db.insert(schema.gameSubmissions).values({ userId, name: i.name, summary: i.summary, mainSkill: i.skill, relatedSkills: i.related, ageGroup: i.age, duration: i.duration, kind: i.kind, priceModel: i.price, link: i.link, makerName: i.maker, contact: i.contact }).returning();
  return { id: s.id, status: s.status };
}

export const STATUS_FA = { received: "درخواست دریافت شد", reviewing: "در حال بررسی", needs_info: "نیاز به تکمیل اطلاعات", approved: "تأیید شد", published: "منتشر شد", needs_fix: "نیازمند اصلاح" } as const;

export async function mySubmissions(userId: string) {
  const rows = await db.select().from(schema.gameSubmissions).where(eq(schema.gameSubmissions.userId, userId)).orderBy(desc(schema.gameSubmissions.createdAt));
  return rows.map((r) => ({ id: r.id, name: r.name, status: r.status, statusLabel: STATUS_FA[r.status], adminNote: r.adminNote, createdAt: r.createdAt }));
}

export async function adminInbox() {
  const [games, contacts, collabs] = await Promise.all([
    db.select().from(schema.gameSubmissions).orderBy(desc(schema.gameSubmissions.createdAt)).limit(100),
    db.select().from(schema.contactMessages).orderBy(desc(schema.contactMessages.createdAt)).limit(100),
    db.select().from(schema.collabRequests).orderBy(desc(schema.collabRequests.createdAt)).limit(100),
  ]);
  return { games, contacts, collabs };
}

export async function setSubmissionStatus(id: string, status: keyof typeof STATUS_FA, adminNote?: string) {
  const [s] = await db.update(schema.gameSubmissions).set({ status, adminNote }).where(eq(schema.gameSubmissions.id, id)).returning();
  if (!s) throw notFound("درخواست");
  if (s.userId) await notify(s.userId, "submission", `وضعیت بازی «${s.name}»: ${STATUS_FA[status]}`, adminNote, "/panel/student/arcade");
  return s;
}

/** Turns an approved submission into a published arcade game. */
export async function publishSubmission(id: string) {
  const [s] = await db.select().from(schema.gameSubmissions).where(eq(schema.gameSubmissions.id, id));
  if (!s) throw notFound("درخواست");
  const slug = `g-${id.slice(0, 8)}`;
  const group = /مالی|پول/.test(`${s.mainSkill}`) ? "finance" : /کارآفرین|ایده/.test(`${s.mainSkill}`) ? "entrepreneurship" : "soft";
  await db.insert(schema.games).values({ slug, title: s.name, shortText: s.summary ?? s.name, cover: "/assets/konjed/arcade/game-valley-landscape.webp", skillGroup: group, skillLabel: s.mainSkill ?? "مهارت", creatorName: s.makerName ?? "سازنده مهمان", playUrl: s.link, priceModel: s.priceModel === "پولی" ? "paid" : "free", tags: ["جدید"] }).onConflictDoNothing();
  return setSubmissionStatus(id, "published");
}
export const setInboxStatus = async (table: "contact" | "collab", id: string, status: "new" | "in_progress" | "done") => {
  if (table === "contact") await db.update(schema.contactMessages).set({ status }).where(eq(schema.contactMessages.id, id));
  else await db.update(schema.collabRequests).set({ status }).where(eq(schema.collabRequests.id, id));
};
