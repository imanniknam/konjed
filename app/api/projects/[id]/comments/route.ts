import { route, body } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { addComment } from "@/lib/server/services/projects";
import { commentSchema } from "@/lib/server/validation";
export const POST = route<{ id: string }>(async ({ req, params }) => addComment(params.id, (await requireUser()).id, await body(req, commentSchema)), { limit: [20, 60_000] });
