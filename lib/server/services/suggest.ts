import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import { db, schema } from "../db/client";
import { toDto } from "./games";

/** «پیشنهادهای کنجد»: unplayed games, favouring the skill group the student has practised least. */
export async function GAMES_SUGGEST(userId: string, limit = 3) {
  const played = (await db.select({ g: schema.gamePlays.gameId }).from(schema.gamePlays).where(eq(schema.gamePlays.userId, userId))).map((x) => x.g);
  const rows = await db.select().from(schema.games).where(and(eq(schema.games.status, "published"), played.length ? notInArray(schema.games.id, played) : undefined)).orderBy(desc(schema.games.featured), desc(schema.games.playsCount), sql`random()`).limit(limit);
  return rows.map(toDto);
}
