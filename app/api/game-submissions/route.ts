import { route, body } from "@/lib/server/http/handler";
import { getUser, requireUser } from "@/lib/server/auth/session";
import { createGameSubmission, mySubmissions } from "@/lib/server/services/inbox";
import { gameSubmissionSchema } from "@/lib/server/validation";
export const POST = route(async ({ req }) => createGameSubmission((await getUser())?.id ?? null, await body(req, gameSubmissionSchema)), { limit: [5, 600_000] });
export const GET = route(async () => ({ submissions: await mySubmissions((await requireUser()).id) }));
