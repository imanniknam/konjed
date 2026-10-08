import { route } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { classReport } from "@/lib/server/services/coach";
export const GET = route<{ id: string }>(async ({ params }) => { const u = await requireUser("coach"); return classReport(u.id, params.id, u.role === "admin"); });
