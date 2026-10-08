import { route } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { classDetail } from "@/lib/server/services/coach";
export const GET = route<{ id: string }>(async ({ params }) => { const u = await requireUser("coach"); return classDetail(u.id, params.id, u.role === "admin"); });
