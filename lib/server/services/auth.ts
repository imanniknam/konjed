import { randomBytes } from "node:crypto";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/client";
import { hashPassword, verifyPassword } from "../auth/password";
import { createSession } from "../auth/session";
import { ApiError, conflict } from "../http/errors";
import { loginSchema, registerSchema } from "../validation";
import { notify } from "./common";

const linkCode = () => randomBytes(5).toString("base64url").replace(/[-_]/g, "x").slice(0, 6).toUpperCase();
const byIdentifier = (id: string) => (id.includes("@") ? eq(schema.users.email, id) : eq(schema.users.phone, id));

export async function register(input: z.infer<typeof registerSchema>) {
  const [exists] = await db.select({ id: schema.users.id }).from(schema.users).where(byIdentifier(input.identifier)).limit(1);
  if (exists) throw conflict("با این ایمیل/شماره قبلاً ثبت‌نام شده. وارد شو.");
  if (input.role === "student" && !input.age) throw new ApiError(422, "validation", "سن مهارت‌آموز را وارد کن.", { age: "سن را وارد کن." });
  const isMail = input.identifier.includes("@");
  const user = await db.transaction(async (tx) => {
    const [u] = await tx.insert(schema.users).values({
      role: input.role, displayName: input.displayName, email: isMail ? input.identifier : null, phone: isMail ? null : input.identifier,
      passwordHash: await hashPassword(input.password), approved: input.role !== "coach", birthYear: input.age ? new Date().getFullYear() - input.age : null,
    }).returning();
    if (input.role === "student") {
      for (let i = 0; i < 5; i++) {
        try { await tx.insert(schema.studentProfiles).values({ userId: u.id, linkCode: linkCode() }); break; } catch (e) { if (i === 4) throw e; }
      }
    }
    return u;
  });
  await createSession(user.id);
  await notify(user.id, "welcome", "به کنجد خوش اومدی!", user.role === "coach" ? "حساب مربی‌ات بعد از تأیید تیم کنجد فعال می‌شه." : "اولین ماجراجویی‌ت منتظرته.", `/panel/${user.role}`);
  if (user.role === "coach") for (const a of await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.role, "admin"))) await notify(a.id, "coach", "مربی جدید منتظر تأییده", user.displayName, "/panel/admin/users");
  return { id: user.id, role: user.role, displayName: user.displayName };
}

export async function login(input: z.infer<typeof loginSchema>) {
  const [u] = await db.select().from(schema.users).where(byIdentifier(input.identifier)).limit(1);
  // same message for unknown user / wrong password
  if (!u || !(await verifyPassword(input.password, u.passwordHash))) throw new ApiError(401, "bad_credentials", "ایمیل/شماره یا رمز عبور درست نیست.");
  if (u.disabled) throw new ApiError(403, "disabled", "این حساب مسدود شده؛ با پشتیبانی تماس بگیر.");
  await createSession(u.id);
  return { id: u.id, role: u.role, displayName: u.displayName };
}

export async function changePassword(userId: string, current: string, next: string) {
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!u || !(await verifyPassword(current, u.passwordHash))) throw new ApiError(400, "bad_password", "رمز فعلی درست نیست.");
  await db.update(schema.users).set({ passwordHash: await hashPassword(next) }).where(eq(schema.users.id, userId));
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  await createSession(userId);
}
void or;
