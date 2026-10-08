import { route, body } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { attendanceReport, recordAttendance } from "@/lib/server/services/coach";
import { attendanceSchema } from "@/lib/server/validation";
export const GET = route<{ id: string }>(async ({ params }) => { const u = await requireUser("coach"); return { sessions: await attendanceReport(u.id, params.id, u.role === "admin") }; });
export const POST = route<{ id: string }>(async ({ req, params }) => { const u = await requireUser("coach"); return recordAttendance(u.id, params.id, await body(req, attendanceSchema), u.role === "admin"); });
