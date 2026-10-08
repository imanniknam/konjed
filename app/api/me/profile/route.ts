import { eq } from "drizzle-orm";
import { route, body } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { db, schema } from "@/lib/server/db/client";
import { profileSchema } from "@/lib/server/validation";
export const GET = route(async () => { const u = await requireUser(); const [p] = await db.select({ linkCode: schema.studentProfiles.linkCode }).from(schema.studentProfiles).where(eq(schema.studentProfiles.userId, u.id)); return { ...u, linkCode: p?.linkCode ?? null }; });
export const PATCH = route(async ({ req }) => { const u = await requireUser(); const b = await body(req, profileSchema); await db.update(schema.users).set({ ...(b.displayName ? { displayName: b.displayName } : {}), ...(b.avatar !== undefined ? { avatar: b.avatar } : {}) }).where(eq(schema.users.id, u.id)); return { updated: true }; });
