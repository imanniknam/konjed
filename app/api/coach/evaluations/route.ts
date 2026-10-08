import { route } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { evaluationQueue } from "@/lib/server/services/coach";
export const GET = route(async () => { const u = await requireUser("coach"); return { items: await evaluationQueue(u.id, u.role === "admin") }; });
