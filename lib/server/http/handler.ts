import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { ApiError } from "./errors";
import { rateLimit } from "./ratelimit";

type Ctx<P> = { req: NextRequest; params: P; ip: string };

export const clientIp = (req: NextRequest) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";

/** Same-origin check for state-changing requests (cookies are SameSite=Lax; this closes the remaining gap). */
function assertSameOrigin(req: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("host");
  if (new URL(origin).host !== host) throw new ApiError(403, "bad_origin", "درخواست از مبدأ نامعتبر آمده است.");
}

/** Wrap a route handler: origin check, light rate limit, error → JSON. */
export function route<P = Record<string, string>>(fn: (c: Ctx<P>) => Promise<unknown>, opts: { limit?: [number, number] } = {}) {
  return async (req: NextRequest, { params }: { params: Promise<P> }) => {
    try {
      assertSameOrigin(req);
      const ip = clientIp(req);
      // reads are cheap and shared NATs (school labs) are common: generous for GET, tighter for writes
      const [max, win] = opts.limit ?? (req.method === "GET" ? [900, 60_000] : [120, 60_000]);
      rateLimit(`${ip}:${req.method}:${new URL(req.url).pathname.split("/").slice(0, 4).join("/")}`, max, win);
      const out = await fn({ req, params: await params, ip });
      if (out instanceof NextResponse || out instanceof Response) return out;
      return NextResponse.json({ ok: true, data: out ?? null });
    } catch (e) {
      if (e instanceof ApiError) return NextResponse.json({ ok: false, error: { code: e.code, message: e.message, fields: e.fields } }, { status: e.status });
      if (e instanceof ZodError) {
        const fields: Record<string, string> = {};
        for (const i of e.issues) fields[i.path.join(".") || "_"] = i.message;
        return NextResponse.json({ ok: false, error: { code: "validation", message: Object.values(fields)[0] ?? "اطلاعات واردشده درست نیست.", fields } }, { status: 422 });
      }
      const pgCode = (e as { code?: string; cause?: { code?: string } }).code ?? (e as { cause?: { code?: string } }).cause?.code;
      if (pgCode === "22P02") return NextResponse.json({ ok: false, error: { code: "bad_id", message: "شناسه نامعتبر است." } }, { status: 400 });
      if (pgCode === "23505") return NextResponse.json({ ok: false, error: { code: "conflict", message: "این مقدار قبلاً ثبت شده (تکراری)." } }, { status: 409 });
      if (pgCode === "23503") return NextResponse.json({ ok: false, error: { code: "in_use", message: "این مورد به داده‌های دیگر وصل است و فعلاً قابل حذف/ثبت نیست." } }, { status: 409 });
      console.error("[api]", e);
      return NextResponse.json({ ok: false, error: { code: "server", message: "مشکلی در سرور پیش آمد. دوباره امتحان کن." } }, { status: 500 });
    }
  };
}

export async function body<T extends ZodTypeAny>(req: NextRequest, schema: T): Promise<z.infer<T>> {
  let json: unknown;
  try { json = await req.json(); } catch { throw new ApiError(400, "bad_json", "قالب درخواست درست نیست."); }
  return schema.parse(json);
}
export const query = <T extends ZodTypeAny>(req: NextRequest, schema: T): z.infer<T> =>
  schema.parse(Object.fromEntries(new URL(req.url).searchParams));
