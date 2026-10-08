import { z } from "zod";
import { route, body } from "@/lib/server/http/handler";
import { requireAdmin } from "@/lib/server/auth/session";
import { cmsDefault, effectiveDoc, listDocs, resetDoc, revisionData, revisions, saveDoc } from "@/lib/server/cms";
import { badRequest, notFound } from "@/lib/server/http/errors";

/** GET ?key=…  → document (+revisions) · GET → list of documents · PUT {key,data} → save · POST {key,revisionId} → restore · DELETE ?key=… → reset to default */
export const GET = route(async ({ req }) => {
  await requireAdmin();
  const key = new URL(req.url).searchParams.get("key");
  if (!key) return { docs: await listDocs() };
  const d = await effectiveDoc(key);
  return { key, ...d, default: cmsDefault(key), revisions: await revisions(key) };
});
export const PUT = route(async ({ req }) => { const u = await requireAdmin(); const b = await body(req, z.object({ key: z.string().max(120), data: z.unknown() })); await saveDoc(b.key, b.data, u.id); return { saved: true }; });
export const POST = route(async ({ req }) => {
  const u = await requireAdmin();
  const b = await body(req, z.object({ key: z.string().max(120), revisionId: z.string().uuid() }));
  const r = await revisionData(b.revisionId);
  if (!r || r.key !== b.key) throw notFound("نسخه");
  await saveDoc(b.key, r.data, u.id);
  return { restored: true };
});
export const DELETE = route(async ({ req }) => { const u = await requireAdmin(); const key = new URL(req.url).searchParams.get("key"); if (!key) throw badRequest("کلید سند لازم است."); await resetDoc(key, u.id); return { reset: true }; });
