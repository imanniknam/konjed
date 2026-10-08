import { route } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { rankings } from "@/lib/server/services/gamification";
export const GET = route(async () => rankings((await requireUser("student")).id));
