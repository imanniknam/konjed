import { route } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { getMission } from "@/lib/server/services/missions";
export const GET = route<{ id: string }>(async ({ params }) => getMission((await requireUser("student")).id, params.id));
