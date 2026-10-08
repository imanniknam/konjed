import { route } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { toggleReminder } from "@/lib/server/services/challenges";
export const POST = route<{ id: string }>(async ({ params }) => toggleReminder((await requireUser()).id, params.id));
