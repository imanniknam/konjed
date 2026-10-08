import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/client";
import { ApiError, forbidden, notFound } from "../http/errors";
import { commentSchema, projectSchema, projectsQuery } from "../validation";
import { GROUP_FA, KIND_FA, KIND_FROM_FA, notify } from "./common";
import { award } from "./gamification";

const SKILL_GROUP: Record<string, keyof typeof GROUP_FA> = { "حل مسئله": "soft", "تصمیم‌گیری": "soft", "کار تیمی": "soft", "ارتباط مؤثر": "soft", "خلاقیت": "soft", "مدیریت زمان": "soft", "مدیریت پول": "finance", "پس‌انداز": "finance", "بودجه‌بندی": "finance", "خرید هوشمندانه": "finance", "تصمیم‌گیری مالی": "finance", "سواد مالی": "finance", "ایده‌پردازی": "entrepreneurship", "شناخت مسئله": "entrepreneurship", "شناخت مشتری": "entrepreneurship", "مدل کسب‌وکار": "entrepreneurship", "ارائه ایده": "entrepreneurship", "کارآفرینی": "entrepreneurship" };

const select = {
  id: schema.projects.id, title: schema.projects.title, description: schema.projects.description, skill: schema.projects.skill, kind: schema.projects.kind,
  coverUrl: schema.projects.coverUrl, fileUrl: schema.projects.fileUrl, likes: schema.projects.likesCount, comments: schema.projects.commentsCount,
  featured: schema.projects.featured, createdAt: schema.projects.createdAt, status: schema.projects.status, authorId: schema.users.id, author: schema.users.displayName,
};
const shape = <T extends { kind: keyof typeof KIND_FA; skill: string | null }>(r: T) => ({ ...r, kindLabel: KIND_FA[r.kind], group: r.skill ? SKILL_GROUP[r.skill] ?? null : null });

export async function listProjects(q: z.infer<typeof projectsQuery>, viewerId?: string | null) {
  const conds: (SQL | undefined)[] = [eq(schema.projects.status, "published")];
  if (q.kind) conds.push(eq(schema.projects.kind, q.kind));
  if (q.q) { const like = `%${q.q}%`; conds.push(or(ilike(schema.projects.title, like), ilike(schema.projects.skill, like), ilike(schema.projects.description, like))); }
  if (q.group) conds.push(sql`${schema.projects.skill} = any(${sql.raw(`array[${Object.entries(SKILL_GROUP).filter(([, g]) => g === q.group).map(([k]) => `'${k.replace(/'/g, "''")}'`).join(",")}]`)})`);
  const rows = await db.select(select).from(schema.projects).innerJoin(schema.users, eq(schema.users.id, schema.projects.authorId)).where(and(...conds))
    .orderBy(...(q.sort === "popular" ? [desc(schema.projects.likesCount), desc(schema.projects.createdAt)] : [desc(schema.projects.createdAt)])).limit(q.limit);
  const liked = viewerId ? new Set((await db.select({ p: schema.projectLikes.projectId }).from(schema.projectLikes).where(eq(schema.projectLikes.userId, viewerId))).map((x) => x.p)) : new Set<string>();
  return rows.map((r) => ({ ...shape(r), liked: liked.has(r.id) }));
}

export async function getProject(id: string, viewerId?: string | null) {
  const [r] = await db.select(select).from(schema.projects).innerJoin(schema.users, eq(schema.users.id, schema.projects.authorId)).where(eq(schema.projects.id, id));
  if (!r || (r.status !== "published" && r.authorId !== viewerId)) throw notFound("پروژه");
  const comments = await db.select({ id: schema.projectComments.id, body: schema.projectComments.body, author: schema.users.displayName, createdAt: schema.projectComments.createdAt })
    .from(schema.projectComments).innerJoin(schema.users, eq(schema.users.id, schema.projectComments.userId)).where(eq(schema.projectComments.projectId, id)).orderBy(desc(schema.projectComments.createdAt)).limit(50);
  const [lk] = viewerId ? await db.select().from(schema.projectLikes).where(and(eq(schema.projectLikes.projectId, id), eq(schema.projectLikes.userId, viewerId))) : [];
  return { ...shape(r), liked: !!lk, commentList: comments };
}

export async function createProject(authorId: string, input: z.infer<typeof projectSchema>) {
  const kind = input.type ? KIND_FROM_FA[input.type] : "individual";
  const [p] = await db.insert(schema.projects).values({ authorId, title: input.title, description: input.desc ?? "", skill: input.skill, kind, coverUrl: input.coverUrl, fileUrl: input.fileUrl }).returning();
  await award(authorId, 30, 3, "انتشار پروژه در ویترین", { type: "project", id: p.id });
  return p;
}

export async function toggleLike(projectId: string, userId: string) {
  return db.transaction(async (tx) => {
    const [p] = await tx.select({ authorId: schema.projects.authorId, title: schema.projects.title }).from(schema.projects).where(eq(schema.projects.id, projectId));
    if (!p) throw notFound("پروژه");
    const del = await tx.delete(schema.projectLikes).where(and(eq(schema.projectLikes.projectId, projectId), eq(schema.projectLikes.userId, userId))).returning();
    let liked = false;
    if (del.length) await tx.update(schema.projects).set({ likesCount: sql`greatest(0, ${schema.projects.likesCount} - 1)` }).where(eq(schema.projects.id, projectId));
    else {
      await tx.insert(schema.projectLikes).values({ projectId, userId });
      await tx.update(schema.projects).set({ likesCount: sql`${schema.projects.likesCount} + 1` }).where(eq(schema.projects.id, projectId));
      liked = true;
      if (p.authorId !== userId) await tx.insert(schema.notifications).values({ userId: p.authorId, kind: "like", title: "پروژه‌ات یک پسند گرفت", body: p.title, href: "/panel/student/projects" });
    }
    const [x] = await tx.select({ n: schema.projects.likesCount }).from(schema.projects).where(eq(schema.projects.id, projectId));
    return { liked, likes: x.n };
  });
}

export async function addComment(projectId: string, userId: string, input: z.infer<typeof commentSchema>) {
  const [p] = await db.select({ authorId: schema.projects.authorId, title: schema.projects.title }).from(schema.projects).where(eq(schema.projects.id, projectId));
  if (!p) throw notFound("پروژه");
  const [c] = await db.insert(schema.projectComments).values({ projectId, userId, body: input.body }).returning();
  await db.update(schema.projects).set({ commentsCount: sql`${schema.projects.commentsCount} + 1` }).where(eq(schema.projects.id, projectId));
  if (p.authorId !== userId) await notify(p.authorId, "feedback", "بازخورد جدید برای پروژه‌ات", p.title, "/panel/student/projects");
  return c;
}

export async function myProjects(userId: string) {
  const rows = await db.select(select).from(schema.projects).innerJoin(schema.users, eq(schema.users.id, schema.projects.authorId)).where(eq(schema.projects.authorId, userId)).orderBy(desc(schema.projects.createdAt));
  return rows.map(shape);
}

export async function deleteProject(id: string, userId: string, isAdmin = false) {
  const [p] = await db.select({ a: schema.projects.authorId }).from(schema.projects).where(eq(schema.projects.id, id));
  if (!p) throw notFound("پروژه");
  if (p.a !== userId && !isAdmin) throw forbidden();
  await db.delete(schema.projects).where(eq(schema.projects.id, id));
}
void ApiError;
