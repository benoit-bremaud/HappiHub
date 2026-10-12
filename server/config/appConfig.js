/** Validate environment configuration once, without exposing secret values in errors. */
export const readAppConfig = (env) => {
  const production = env.NODE_ENV === 'production';
  const suffix = production ? 'PROD' : env.NODE_ENV === 'test' ? 'TEST' : 'DEV';
  const config = { sessionSecret: env[`SESSION_SECRET_${suffix}`], production,
    cookieName: production ? '__Host-happihub.sid' : 'happihub.sid',
    origin: env[`APP_URL_${suffix}`], port: Number(env[`PORT_${suffix}`] || 5000),
    trustedProxy: env.TRUSTED_PROXY || false,
  };
  if (typeof config.sessionSecret !== 'string' || Buffer.byteLength(config.sessionSecret) < 32)
    throw new Error('Session signing key must contain at least 32 bytes');
  try {
    const url = new URL(config.origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== config.origin ||
      (production && url.protocol !== 'https:')) throw new Error();
  } catch { throw new Error('Application origin configuration is invalid'); }
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error('Port configuration is invalid');
  if (config.trustedProxy && !/^[a-fA-F0-9:.]+(?:\/[0-9]{1,3})?$/.test(config.trustedProxy))
    throw new Error('Trusted proxy must be an explicit IP address or CIDR');
  return Object.freeze(config);
};
