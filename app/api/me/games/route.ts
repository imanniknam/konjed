import { route } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { myGames } from "@/lib/server/services/games";
export const GET = route(async () => ({ games: await myGames((await requireUser("student")).id) }));
