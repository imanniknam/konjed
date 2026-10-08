import { route, body } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { enterChallenge } from "@/lib/server/services/challenges";
import { challengeEntrySchema } from "@/lib/server/validation";
export const POST = route<{ id: string }>(async ({ req, params }) => enterChallenge((await requireUser("student")).id, params.id, await body(req, challengeEntrySchema)), { limit: [10, 600_000] });
