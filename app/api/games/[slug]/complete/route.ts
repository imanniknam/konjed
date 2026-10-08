import { route } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { completeGame } from "@/lib/server/services/games";
export const POST = route<{ slug: string }>(async ({ params }) => { const u = await requireUser("student"); await completeGame(params.slug, u.id); return { completed: true }; });
