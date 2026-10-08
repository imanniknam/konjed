import { z } from "zod";
import { route, body } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { badRequest, forbidden } from "@/lib/server/http/errors";
import { setInboxStatus } from "@/lib/server/services/inbox";
export const PATCH = route<{ table: string; id: string }>(async ({ req, params }) => {
  const u = await requireUser(); if (u.role !== "admin") throw forbidden();
  if (params.table !== "contact" && params.table !== "collab") throw badRequest("جدول نامعتبر است.");
  const b = await body(req, z.object({ status: z.enum(["new", "in_progress", "done"]) }));
  await setInboxStatus(params.table, params.id, b.status); return { updated: true };
});
