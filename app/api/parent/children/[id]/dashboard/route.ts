import { route } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { childDashboard } from "@/lib/server/services/parent";
export const GET = route<{ id: string }>(async ({ params }) => childDashboard((await requireUser("parent")).id, params.id));
