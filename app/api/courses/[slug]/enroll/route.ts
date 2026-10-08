import { route } from "@/lib/server/http/handler";
import { requireUser } from "@/lib/server/auth/session";
import { enroll } from "@/lib/server/services/courses";
export const POST = route<{ slug: string }>(async ({ params }) => enroll((await requireUser("student")).id, params.slug), { limit: [20, 60_000] });
