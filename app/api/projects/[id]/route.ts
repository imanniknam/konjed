import { route } from "@/lib/server/http/handler";
import { getUser, requireUser } from "@/lib/server/auth/session";
import { deleteProject, getProject } from "@/lib/server/services/projects";
export const GET = route<{ id: string }>(async ({ params }) => getProject(params.id, (await getUser())?.id));
export const DELETE = route<{ id: string }>(async ({ params }) => { const u = await requireUser(); await deleteProject(params.id, u.id, u.role === "admin"); return { deleted: true }; });
