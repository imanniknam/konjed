import { route } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { children } from "@/lib/server/services/parent";
export const GET = route(async () => ({ children: await children((await requireUser("parent")).id) }));
