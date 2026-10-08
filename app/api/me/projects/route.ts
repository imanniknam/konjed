import { route } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { myProjects } from "@/lib/server/services/projects";
export const GET = route(async () => ({ projects: await myProjects((await requireUser()).id) }));
