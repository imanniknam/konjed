import { route } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { assertChild, childSkills } from "@/lib/server/services/parent";
export const GET = route<{ id: string }>(async ({ params }) => { const u = await requireUser("parent"); await assertChild(u.id, params.id); return childSkills(params.id); });
