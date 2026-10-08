import { route } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { adminInbox } from "@/lib/server/services/inbox";
export const GET = route(async () => { const u = await requireUser(); if (u.role !== "admin") throw (await import("@/lib/server/http/errors")).forbidden(); return adminInbox(); });
