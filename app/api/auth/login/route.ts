import { route, body } from "@/lib/server/http/handler";
import { ApiError } from "@/lib/server/http/errors";
import { failureLimiter } from "@/lib/server/http/ratelimit";
import { login } from "@/lib/server/services/auth";
import { loginSchema } from "@/lib/server/validation";

/** Loose per-IP request cap (school labs share an IP) + strict per-account cap on FAILED attempts (password guessing). */
export const POST = route(async ({ req, ip }) => {
  const b = await body(req, loginSchema);
  const acct = failureLimiter(`login-fail:${b.identifier}`, 8, 300_000);
  const addr = failureLimiter(`login-fail-ip:${ip}`, 60, 300_000);
  acct.check(); addr.check();
  try {
    const out = await login(b);
    acct.clear();
    return out;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) { acct.fail(); addr.fail(); }
    throw e;
  }
}, { limit: [300, 300_000] });
