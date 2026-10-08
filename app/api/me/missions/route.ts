import { route } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { missionMap } from "@/lib/server/services/missions";
export const GET = route(async () => ({ paths: await missionMap((await requireUser("student")).id) }));
