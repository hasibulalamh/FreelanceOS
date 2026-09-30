// Fixed-window in-memory rate limiter.
//
// SECURITY NOTE: this is per-process and per-instance. It is adequate for a
// single-user deployment on one Vercel instance and as a dev placeholder.
// It MUST be replaced by the Redis-based limiter in the Redis/BullMQ phase
// before any multi-instance deployment.

const windows = new Map(); // key -> { count, resetAt }

/**
 * @param {string} key unique key, e.g. `register:1.2.3.4`
 * @param {number} limit max requests per window
 * @param {number} windowMs window length in milliseconds
 * @returns {boolean} true if the request is allowed
 */
export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const entry = windows.get(key);

  if (!entry || entry.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;

  entry.count += 1;
  return true;
}

/** Best-effort client IP for rate-limit keys behind Vercel's proxy. */
export function clientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}
