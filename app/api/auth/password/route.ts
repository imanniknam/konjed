import { route, body } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { changePassword } from "@/lib/server/services/auth";
import { passwordSchema } from "@/lib/server/validation";
export const POST = route(async ({ req }) => { const u = await requireUser(); const b = await body(req, passwordSchema); await changePassword(u.id, b.current, b.next); return { changed: true }; }, { limit: [5, 600_000] });
