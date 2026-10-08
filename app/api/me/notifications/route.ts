import { route } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { markRead, notificationsFor } from "@/lib/server/services/dashboard";
export const GET = route(async () => notificationsFor((await requireUser()).id));
export const PATCH = route(async ({ req }) => { const u = await requireUser(); const id = new URL(req.url).searchParams.get("id") ?? undefined; await markRead(u.id, id); return { read: true }; });
