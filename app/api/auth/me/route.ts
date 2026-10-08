import { route } from "@/lib/server/http/handler";
import { getUser } from "@/lib/server/auth/session";
export const GET = route(async () => ({ user: await getUser() }));
