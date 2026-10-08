import { route } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { forbidden } from "@/lib/server/http/errors";
import { publishSubmission } from "@/lib/server/services/inbox";
export const POST = route<{ id: string }>(async ({ params }) => { const u = await requireUser(); if (u.role !== "admin") throw forbidden(); return publishSubmission(params.id); });
