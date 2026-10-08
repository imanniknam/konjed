import { route } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { coachDashboard } from "@/lib/server/services/coach";
export const GET = route(async () => coachDashboard((await requireUser("coach")).id));
