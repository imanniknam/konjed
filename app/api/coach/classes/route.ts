import { route, body } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { createClass, listClasses } from "@/lib/server/services/coach";
import { classSchema } from "@/lib/server/validation";
export const GET = route(async () => ({ classes: await listClasses((await requireUser("coach")).id) }));
export const POST = route(async ({ req }) => createClass((await requireUser("coach")).id, await body(req, classSchema)));
