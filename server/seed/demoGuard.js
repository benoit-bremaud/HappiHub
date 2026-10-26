import { isIP } from 'node:net';

const isLoopback = (host) => host === 'localhost' || (isIP(host) === 4 && host.startsWith('127.')) || host === '::1';
// A Docker Compose service name is a single label (no dot), so it cannot name a remote host.
const isServiceName = (host) => /^[a-z0-9][a-z0-9_-]*$/i.test(host);

/**
 * Target guard D5 (test-environment spec § 2): the demo seed runs only on a local `_demo`
 * database of the DEV tier, with `--confirm`, and never next to a production configuration.
 * Returns the refusal reasons; an empty list allows the run. Messages never echo URLs or paths.
 */
export const demoTargetRefusals = (env, args) => {
  const refusals = [];
  if (env.NODE_ENV !== undefined && env.NODE_ENV !== '' && env.NODE_ENV !== 'development')
    refusals.push('NODE_ENV must be unset or development');
  let url = null;
  try { url = new URL(env.DATABASE_URL_DEV); } catch { refusals.push('DATABASE_URL_DEV is missing or invalid'); }
  if (url) {
    if (!decodeURIComponent(url.pathname.slice(1)).endsWith('_demo'))
      refusals.push('the DEV database name must end in _demo');
    const host = url.hostname.replace(/^\[(.*)\]$/, '$1');
    if (!isLoopback(host) && !isServiceName(host)) refusals.push('the DEV database host must be local');
  }
  if (!args.includes('--confirm')) refusals.push('--confirm is required');
  if (env.DATABASE_URL_PROD) refusals.push('DATABASE_URL_PROD must not be set');
  if (env.FIELD_KEYRING_FILE_PROD && env.FIELD_KEYRING_FILE_PROD === env.FIELD_KEYRING_FILE_DEV)
    refusals.push('the DEV keyring must differ from the PROD keyring');
  return refusals;
};
