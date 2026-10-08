import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { db, schema } from "../db/client";
import { ApiError, forbidden, unauthorized } from "../http/errors";

const COOKIE = process.env.SESSION_COOKIE ?? "konjed_session";
const TTL_DAYS = 30;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export type SessionUser = { id: string; role: "student" | "coach" | "parent" | "admin"; displayName: string; email: string | null; phone: string | null; avatar: string | null; approved: boolean };

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_DAYS * 864e5);
  await db.insert(schema.sessions).values({ userId, tokenHash: sha(token), expiresAt, userAgent: (await headers()).get("user-agent")?.slice(0, 200) });
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, sha(token)));
  jar.delete(COOKIE);
}

/** Current user from the session cookie, or null. */
export async function getUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ id: schema.users.id, role: schema.users.role, displayName: schema.users.displayName, email: schema.users.email, phone: schema.users.phone, avatar: schema.users.avatar, approved: schema.users.approved })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.tokenHash, sha(token)), gt(schema.sessions.expiresAt, new Date()), eq(schema.users.disabled, false)))
    .limit(1);
  return row ?? null;
}

/** Guard for route handlers and server components: throws ApiError(401/403). */
export async function requireUser(...roles: SessionUser["role"][]) {
  const u = await getUser();
  if (!u) throw unauthorized();
  if (roles.length && !roles.includes(u.role) && u.role !== "admin") throw forbidden();
  if (u.role === "coach" && !u.approved) throw new ApiError(403, "pending_approval", "حساب مربی‌ات هنوز توسط تیم کنجد تأیید نشده.");
  return u;
}

export async function requireAdmin() {
  const u = await getUser();
  if (!u) throw unauthorized();
  if (u.role !== "admin") throw forbidden();
  return u;
}
