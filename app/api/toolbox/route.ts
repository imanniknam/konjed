import { route } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { toolbox } from "@/lib/server/services/dashboard";
export const GET = route(async () => { await requireUser(); return { items: await toolbox() }; });
