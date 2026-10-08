import { route } from "@/lib/server/http/handler";
import { getGame } from "@/lib/server/services/games";
export const GET = route<{ slug: string }>(async ({ params }) => getGame(params.slug));
