import { isIP } from 'node:net';

const isLoopback = (host) => host === 'localhost' || (isIP(host) === 4 && host.startsWith('127.')) || host === '::1';

/**
 * Transport rule D7 (spec § 7), shared by every entry point: in production the database is on
 * the same host (Unix socket or loopback) or the URL carries the literal `sslmode=verify-full`.
 * Returns the only Pool configuration allowed: no explicit `ssl` option, which would override
 * `sslmode`.
 */
export const databasePoolConfig = (databaseUrl, { production }) => {
  if (production) {
    let url;
    try { url = new URL(databaseUrl); } catch { throw new Error('Database URL configuration is invalid'); }
    // pg-connection-string keeps the LAST value of a repeated key, URLSearchParams.get the FIRST:
    // refuse repeats so the check and the driver see the same host and sslmode (fail closed).
    if (['host', 'sslmode'].some((key) => url.searchParams.getAll(key).length > 1))
      throw new Error('Database URL configuration is invalid');
    const socket = url.searchParams.get('host');
    const host = url.hostname.replace(/^\[(.*)\]$/, '$1');
    const local = socket ? socket.startsWith('/') : host === '' || isLoopback(host);
    if (!local && url.searchParams.get('sslmode') !== 'verify-full')
      throw new Error('A remote database requires sslmode=verify-full in production');
  }
  return { connectionString: databaseUrl };
};
