import { route } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { toggleLike } from "@/lib/server/services/projects";
export const POST = route<{ id: string }>(async ({ params }) => toggleLike(params.id, (await requireUser()).id), { limit: [60, 60_000] });
