import { route } from "@/lib/server/http/handler";
import { destroySession } from "@/lib/server/auth/session";
export const POST = route(async () => { await destroySession(); return { loggedOut: true }; });
