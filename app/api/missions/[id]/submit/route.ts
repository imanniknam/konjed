import { route, body } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { submitMission } from "@/lib/server/services/missions";
import { missionSubmitSchema } from "@/lib/server/validation";
export const POST = route<{ id: string }>(async ({ req, params }) => submitMission((await requireUser("student")).id, params.id, await body(req, missionSubmitSchema)), { limit: [10, 600_000] });
