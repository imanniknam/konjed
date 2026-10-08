import { route, body } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { activateForClass, listChallenges } from "@/lib/server/services/challenges";
import { activateChallengeSchema } from "@/lib/server/validation";
export const GET = route(async () => ({ challenges: await listChallenges() }));
export const POST = route(async ({ req }) => { const u = await requireUser("coach"); return activateForClass(u.id, await body(req, activateChallengeSchema), u.role === "admin"); });
