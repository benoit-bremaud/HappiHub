/** ADR-0001: 30 min idle expiry for every session, 8 h absolute cap once signed in. */
export const IDLE_MS = 30 * 60 * 1000;
export const ABSOLUTE_MS = 8 * 60 * 60 * 1000;
/**
 * Absolute cap checked in code (ADR-0001). Idle expiry is the store's `expire` column, which
 * connect-pg-simple refreshes on every touch, so an idle session is never returned by the store.
 */
export const sessionDeadline = (session) => session.startedAt + (session.accountId ? ABSOLUTE_MS : IDLE_MS);
export const isSessionCurrent = (session, now) => Number.isFinite(session.startedAt) &&
  Number.isFinite(now) && now < sessionDeadline(session);
