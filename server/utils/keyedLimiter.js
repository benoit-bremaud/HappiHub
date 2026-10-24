/**
 * Process-local fixed-window counter keyed by account or recipient (quotas T2). Valid for the
 * single API instance, like the per-IP limiter (ADR-0001 consequences).
 */
export const createKeyedLimiter = ({ limit, windowMs }) => {
  const windows = new Map();
  const current = (key, now) => {
    const entry = windows.get(key);
    if (entry && now < entry.resetAt) return entry;
    const fresh = { count: 0, resetAt: now + windowMs };
    windows.set(key, fresh);
    return fresh;
  };
  return {
    /** Seconds until the key may try again, or 0 when it is under the limit. */
    retryAfter: (key, now) => {
      const entry = current(key, now);
      return entry.count >= limit ? Math.ceil((entry.resetAt - now) / 1000) : 0;
    },
    /** Count one attempt; false when the limit was already reached. */
    take: (key, now) => {
      const entry = current(key, now);
      if (entry.count >= limit) return false;
      entry.count += 1;
      return true;
    },
    /** Give back an attempt taken in this window (a success); never below 0. */
    release: (key, now) => {
      const entry = current(key, now);
      entry.count = Math.max(0, entry.count - 1);
    },
  };
};
