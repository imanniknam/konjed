import { z } from "zod";
import { route, body } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { addStudentToClass, unassignedStudents } from "@/lib/server/services/coach";
export const GET = route<{ id: string }>(async ({ params }) => { const u = await requireUser("coach"); return { students: await unassignedStudents(u.id, params.id, u.role === "admin") }; });
export const POST = route<{ id: string }>(async ({ req, params }) => { const u = await requireUser("coach"); const b = await body(req, z.object({ studentId: z.string().uuid() })); return addStudentToClass(u.id, params.id, b.studentId, u.role === "admin"); });
