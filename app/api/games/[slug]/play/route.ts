import { route } from "@/lib/server/http/handler";
import { getUser } from "@/lib/server/auth/session";
import { startGame } from "@/lib/server/services/games";
export const POST = route<{ slug: string }>(async ({ params }) => startGame(params.slug, (await getUser())?.id ?? null), { limit: [60, 60_000] });
