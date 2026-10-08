import { route } from "@/lib/server/http/handler";
import { requireAdmin } from "@/lib/server/auth/session";
import { removeResource, updateResource } from "@/lib/server/admin/resources";
export const PATCH = route<{ resource: string; id: string }>(async ({ req, params }) => { const u = await requireAdmin(); return updateResource(params.resource, params.id, await req.json().catch(() => ({})), u.id); });
export const DELETE = route<{ resource: string; id: string }>(async ({ params }) => { const u = await requireAdmin(); return removeResource(params.resource, params.id, u.id); });
