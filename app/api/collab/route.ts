import { route, body } from "@/lib/server/http/handler";
import { createCollab } from "@/lib/server/services/inbox";
import { collabSchema } from "@/lib/server/validation";
export const POST = route(async ({ req }) => createCollab(await body(req, collabSchema)), { limit: [5, 600_000] });
