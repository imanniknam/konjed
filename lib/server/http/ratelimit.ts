import { ApiError } from "./errors";

/**
 * Fixed-window in-memory limiter. Enough for one Node process; behind several instances
 * swap `hits` for Redis (INCR + EXPIRE) behind the same `rateLimit` signature.
 */
const hits = new Map<string, { n: number; reset: number }>();

export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) { hits.set(key, { n: 1, reset: now + windowMs }); return; }
  h.n += 1;
  if (h.n > max) throw new ApiError(429, "rate_limited", "تعداد درخواست‌ها زیاد بود؛ کمی بعد دوباره امتحان کن.");
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
}

/** Counts only FAILURES (e.g. wrong passwords); a successful action clears the counter. */
export function failureLimiter(key: string, max: number, windowMs: number) {
  const entry = () => { const h = hits.get(key); return h && h.reset > Date.now() ? h : undefined; };
  return {
    check() { const h = entry(); if (h && h.n >= max) throw new ApiError(429, "rate_limited", "تلاش‌های ناموفق زیاد بود؛ چند دقیقه بعد دوباره امتحان کن."); },
    fail() { const h = entry(); if (h) h.n += 1; else hits.set(key, { n: 1, reset: Date.now() + windowMs }); },
    clear() { hits.delete(key); },
  };
}
