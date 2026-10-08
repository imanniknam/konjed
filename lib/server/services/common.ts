import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "../db/client";

export const KIND_FA = { individual: "فردی", group: "گروهی", learning_experience: "تجربه یادگیری", idea: "ایده خلاقانه" } as const;
export const KIND_FROM_FA: Record<string, keyof typeof KIND_FA> = { "فردی": "individual", "گروهی": "group", "تجربه یادگیری": "learning_experience", "ایده خلاقانه": "idea" };
export const GROUP_FA = { soft: "مهارت‌های نرم", finance: "سواد مالی", entrepreneurship: "کارآفرینی" } as const;

/** Persian-aware normalisation for search (drops ZWNJ/spaces, unifies ی/ک). */
export const normFa = (s: string) => s.replace(/[‌\s]+/g, "").replace(/ي/g, "ی").replace(/ك/g, "ک").toLowerCase();

export async function notify(userId: string, kind: string, title: string, body?: string, href?: string) {
  await db.insert(schema.notifications).values({ userId, kind, title, body, href });
}

export { and, eq, sql };
