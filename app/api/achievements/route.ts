import { route } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { achievementSummary, badgeProgress } from "@/lib/server/services/gamification";
export const GET = route(async () => { const u = await requireUser("student"); return { summary: await achievementSummary(u.id), badges: await badgeProgress(u.id) }; });
