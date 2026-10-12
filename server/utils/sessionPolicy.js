export const IDLE_MS = 30 * 60 * 1000;
export const ABSOLUTE_MS = 8 * 60 * 60 * 1000;
/** Compute authority expiry independently of Mongo's asynchronous TTL cleanup. */
export const sessionDeadline = (session) => {
  // Mongo touch updates lastModified rather than the serialized cookie expiry.
  const idleDeadline = session.lastModified
    ? new Date(session.lastModified).getTime() + IDLE_MS
    : new Date(session.cookie?.expires).getTime();
  return Math.min(idleDeadline, session.startedAt + (session.userId ? ABSOLUTE_MS : IDLE_MS));
};
export const isSessionCurrent = (session, now) => Number.isFinite(session.startedAt) &&
  Number.isFinite(now) && now < sessionDeadline(session);
