import { route } from "@/lib/server/http/handler";
import { getUser } from "@/lib/server/auth/session";
import { listChallenges } from "@/lib/server/services/challenges";
export const GET = route(async () => ({ challenges: await listChallenges((await getUser())?.id) }));
