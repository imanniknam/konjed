import { route } from "@/lib/server/http/handler";
import { getCourse } from "@/lib/server/services/courses";
export const GET = route<{ slug: string }>(async ({ params }) => getCourse(params.slug));
