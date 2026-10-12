/** Resolve the existing environment keys once at startup; never include values in errors. */
export const readAppConfig = (env) => {
  const suffix = env.NODE_ENV === 'production' ? 'PROD' : env.NODE_ENV === 'test' ? 'TEST' : 'DEV';
  const config = {
    jwtSecret: env[`JWT_SECRET_${suffix}`], jwtExpiration: env[`JWT_EXPIRATION_${suffix}`],
    origin: env[`APP_URL_${suffix}`], port: Number(env[`PORT_${suffix}`] || 5000),
  };
  if (typeof config.jwtSecret !== 'string' || !config.jwtSecret.trim()) throw new Error('JWT signing configuration is required');
  if (!/^[1-9][0-9]*(ms|s|m|h|d|w|y)$/.test(config.jwtExpiration || '')) throw new Error('JWT expiration configuration is invalid');
  try {
    const url = new URL(config.origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== config.origin) throw new Error();
  } catch { throw new Error('Application origin configuration is invalid'); }
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error('Port configuration is invalid');
  return Object.freeze(config);
};
