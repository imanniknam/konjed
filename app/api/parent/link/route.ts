import { route, body } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { linkChild } from "@/lib/server/services/parent";
import { linkChildSchema } from "@/lib/server/validation";
export const POST = route(async ({ req }) => linkChild((await requireUser("parent")).id, await body(req, linkChildSchema)), { limit: [10, 600_000] });
