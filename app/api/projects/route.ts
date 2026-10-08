import { route, body, query } from "@/lib/server/http/handler";
import { getUser, requireUser } from "@/lib/server/auth/session";
import { createProject, listProjects } from "@/lib/server/services/projects";
import { projectSchema, projectsQuery } from "@/lib/server/validation";
export const GET = route(async ({ req }) => ({ projects: await listProjects(query(req, projectsQuery), (await getUser())?.id) }));
export const POST = route(async ({ req }) => { const u = await requireUser("student"); return createProject(u.id, await body(req, projectSchema)); }, { limit: [10, 600_000] });
