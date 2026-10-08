import { route } from "@/lib/server/http/handler";
import { requireAdmin } from "@/lib/server/auth/session";
import { createResource, listResource } from "@/lib/server/admin/resources";
export const GET = route<{ resource: string }>(async ({ req, params }) => { await requireAdmin(); return { rows: await listResource(params.resource, new URL(req.url).searchParams.get("q") ?? undefined) }; });
export const POST = route<{ resource: string }>(async ({ req, params }) => { const u = await requireAdmin(); return createResource(params.resource, await req.json().catch(() => ({})), u.id); });
