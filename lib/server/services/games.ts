import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/client";
import { notFound } from "../http/errors";
import { gamesQuery } from "../validation";
import { GROUP_FA } from "./common";

const pub = eq(schema.games.status, "published");
export type GameDto = ReturnType<typeof toDto>;

export function toDto(g: typeof schema.games.$inferSelect) {
  const fa = (n: number | null) => (n == null ? null : n.toLocaleString("fa-IR"));
  return {
    id: g.id, slug: g.slug, title: g.title, text: g.shortText, cover: g.cover, accent: g.accent, skill: g.skillLabel, skillGroup: g.skillGroup, groupLabel: GROUP_FA[g.skillGroup],
    genre: g.genre, ageLabel: g.ageMin && g.ageMax ? `${fa(g.ageMin)} تا ${fa(g.ageMax)} سال` : null, ageMin: g.ageMin, ageMax: g.ageMax,
    minutes: g.minutes, durationLabel: g.minutes ? `${fa(g.minutes)} دقیقه` : null, price: g.priceModel, priceLabel: g.priceModel === "free" ? "رایگان" : g.priceModel === "paid" ? "پولی" : null,
    tags: g.tags, creator: g.creatorName, playUrl: g.playUrl, plays: g.playsCount, featured: g.featured, publishedAt: g.publishedAt.toISOString(),
  };
}

export async function listGames(q: z.infer<typeof gamesQuery>) {
  const conds: (SQL | undefined)[] = [pub];
  if (q.group) conds.push(eq(schema.games.skillGroup, q.group));
  if (q.q) { const like = `%${q.q.replace(/[‌]/g, "")}%`; conds.push(or(ilike(sql`replace(${schema.games.title}, E'‌', '')`, like), ilike(sql`replace(${schema.games.shortText}, E'‌', '')`, like), ilike(schema.games.skillLabel, like))); }
  if (q.age === "13-14") conds.push(sql`${schema.games.ageMin} is not null and ${schema.games.ageMin} <= 14`);
  if (q.age === "15-17") conds.push(sql`${schema.games.ageMax} is not null and ${schema.games.ageMax} >= 15`);
  if (q.duration === "short") conds.push(sql`${schema.games.minutes} is not null and ${schema.games.minutes} <= 10`);
  if (q.duration === "medium") conds.push(sql`${schema.games.minutes} > 10 and ${schema.games.minutes} <= 20`);
  if (q.price) conds.push(eq(schema.games.priceModel, q.price));
  const order = q.sort === "newest" ? [desc(schema.games.publishedAt)] : q.sort === "popular" ? [desc(schema.games.playsCount), desc(schema.games.publishedAt)] : q.sort === "alpha" ? [asc(schema.games.title)] : [desc(schema.games.featured), desc(schema.games.publishedAt)];
  const rows = await db.select().from(schema.games).where(and(...conds)).orderBy(...order).limit(q.limit);
  return rows.map(toDto);
}

export async function getGame(slug: string) {
  const [g] = await db.select().from(schema.games).where(and(pub, eq(schema.games.slug, slug)));
  if (!g) throw notFound("بازی");
  return toDto(g);
}

/** Records a play (and bumps the popularity counter); returns where to launch the game. */
export async function startGame(slug: string, userId: string | null) {
  const [g] = await db.select().from(schema.games).where(and(pub, eq(schema.games.slug, slug)));
  if (!g) throw notFound("بازی");
  await db.insert(schema.gamePlays).values({ gameId: g.id, userId });
  await db.update(schema.games).set({ playsCount: sql`${schema.games.playsCount} + 1` }).where(eq(schema.games.id, g.id));
  if (userId) { const { checkBadges } = await import("./gamification"); await checkBadges(userId); }
  return { playUrl: g.playUrl };
}

export async function completeGame(slug: string, userId: string) {
  const [g] = await db.select({ id: schema.games.id }).from(schema.games).where(eq(schema.games.slug, slug));
  if (!g) throw notFound("بازی");
  await db.update(schema.gamePlays).set({ completed: true }).where(and(eq(schema.gamePlays.gameId, g.id), eq(schema.gamePlays.userId, userId)));
  const { award } = await import("./gamification");
  await award(userId, 20, 2, "تکمیل بازی", { type: "game", id: g.id });
}

export async function myGames(userId: string) {
  const rows = await db.select({ g: schema.games, completed: sql<boolean>`bool_or(${schema.gamePlays.completed})`, last: sql<Date>`max(${schema.gamePlays.createdAt})` })
    .from(schema.gamePlays).innerJoin(schema.games, eq(schema.games.id, schema.gamePlays.gameId)).where(eq(schema.gamePlays.userId, userId)).groupBy(schema.games.id).orderBy(desc(sql`max(${schema.gamePlays.createdAt})`));
  return rows.map((r) => ({ ...toDto(r.g), completed: r.completed }));
}
