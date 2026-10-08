import { route, body } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { reviewSubmission } from "@/lib/server/services/missions";
import { reviewSchema } from "@/lib/server/validation";
export const PATCH = route<{ id: string }>(async ({ req, params }) => { const u = await requireUser("coach"); return reviewSubmission(u.id, params.id, await body(req, reviewSchema), u.role === "admin"); });
