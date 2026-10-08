import { route } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { studentDashboard } from "@/lib/server/services/dashboard";
export const GET = route(async () => studentDashboard((await requireUser("student")).id));
