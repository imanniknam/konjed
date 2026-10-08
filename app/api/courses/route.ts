import { route } from "@/lib/server/http/handler";
import { listCourses } from "@/lib/server/services/courses";
export const GET = route(async ({ req }) => ({ courses: await listCourses(new URL(req.url).searchParams.get("status") === "registering" ? { status: "registering" } : {}) }));
