import { route, body } from "@/lib/server/http/handler";
import { register } from "@/lib/server/services/auth";
import { registerSchema } from "@/lib/server/validation";
export const POST = route(async ({ req }) => register(await body(req, registerSchema)), { limit: [40, 600_000] });
