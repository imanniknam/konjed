import { z } from "zod";
import { route, body } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { forbidden } from "@/lib/server/http/errors";
import { setSubmissionStatus } from "@/lib/server/services/inbox";
export const PATCH = route<{ id: string }>(async ({ req, params }) => {
  const u = await requireUser(); if (u.role !== "admin") throw forbidden();
  const b = await body(req, z.object({ status: z.enum(["received", "reviewing", "needs_info", "approved", "published", "needs_fix"]), note: z.string().max(1000).optional() }));
  return setSubmissionStatus(params.id, b.status, b.note);
});
