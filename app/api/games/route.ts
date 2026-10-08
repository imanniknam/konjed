import { route, query } from "@/lib/server/http/handler";
import { listGames } from "@/lib/server/services/games";
import { gamesQuery } from "@/lib/server/validation";
export const GET = route(async ({ req }) => ({ games: await listGames(query(req, gamesQuery)) }));
