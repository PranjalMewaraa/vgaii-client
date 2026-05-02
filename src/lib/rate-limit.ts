// In-memory rate limiter. Good enough for single-instance deployments and
// staging; for multi-instance prod, swap this for a Redis-backed counter.
// Keys are typically `<route>:<ip>` so different endpoints don't share quota.

type Bucket = {
  count: number;
  windowStart: number;
};

const store = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

export const rateLimit = (
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult => {
  const now = Date.now();
  const cur = store.get(key);

  if (!cur || now - cur.windowStart > windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (cur.count >= limit) {
    const retryAfterSec = Math.ceil(
      (cur.windowStart + windowMs - now) / 1000,
    );
    return { ok: false, remaining: 0, retryAfterSec };
  }

  cur.count += 1;
  return { ok: true, remaining: limit - cur.count, retryAfterSec: 0 };
};

// Optional: clear a key — used to reset on successful login so a user who
// finally typed the right password isn't penalized for earlier mistakes.
export const clearRateLimit = (key: string) => {
  store.delete(key);
};

export const getClientIp = (req: Request): string => {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
};
