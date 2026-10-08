import { route, body } from "@/lib/server/http/handler";
import { createContact } from "@/lib/server/services/inbox";
import { contactSchema } from "@/lib/server/validation";
export const POST = route(async ({ req }) => createContact(await body(req, contactSchema)), { limit: [5, 600_000] });
