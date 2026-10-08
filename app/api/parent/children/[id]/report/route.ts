import { route } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { childReport } from "@/lib/server/services/parent";
export const GET = route<{ id: string }>(async ({ req, params }) => childReport((await requireUser("parent")).id, params.id, Number(new URL(req.url).searchParams.get("days") ?? 30) || 30));
