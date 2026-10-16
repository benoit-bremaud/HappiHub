# Runtime configuration

Only `.env.example` belongs in Git. Local files and mounted secrets remain ignored.
Use DEV keys in local development mode, TEST in tests, and PROD in production mode.
These legacy suffixes are runtime keys, not additional environment tiers.

Supply `SESSION_SECRET_<suffix>` with a freshly generated private key containing at least
32 random bytes. Do not reuse former JWT keys. Startup accepts `SESSION_SECRET_PROD_FILE`
and `DATABASE_URL_PROD_FILE` for mounted production secrets. JWT keys and expiry settings
are no longer used by the application authentication flow.

APP_URL is the exact browser origin. Production requires HTTPS. TRUSTED_PROXY, if set,
is an explicit IP address or CIDR of the controlled reverse proxy, never a blanket boolean
or unrestricted hop count. Compose trusts only the fixed runtime Nginx address.
The production Compose baseline also requires HAPPIHUB_TRUSTED_INGRESS_FILE, an absolute
path to an operator-controlled file containing the exact TLS gateway peer as observed
by Nginx. It is mounted read-only at /etc/nginx/happihub/trusted-ingress.conf; there is no
permissive fallback. See docs/DOCKER.md for the gateway overwrite contract, NAT caveat,
configuration validation and disposable regression command. This file contains an IP
allowlist, not application credentials. It does not broaden Express's TRUSTED_PROXY.
Client REACT_APP_API_URL includes /api and is public configuration, never a secret.

Supply `DATABASE_URL_<suffix>`, a PostgreSQL connection URL. Apply the schema with the explicit
operator step `npm run migrate` (from `server/`) before starting the API; the server never
migrates on start. Sessions live in the `session` table (`connect-pg-simple`). Run
`npm run maintenance` periodically (hourly) for expiry purges and reminders. Production start is
refused until a real email transport exists (T11a); only the development log transport exists.
Session idle lifetime is 30 minutes and absolute lifetime eight hours. Anonymous bootstrap
lifetime is 30 minutes. Expiry policy is checked before authority is granted, independent
of physical TTL deletion. Session-store failures fail closed for protected requests.

Local Docker uses the ignored server/.env.docker.local file. Follow [Docker workflows](DOCKER.md)
for secret permissions, HTTPS gateway requirements and isolated volumes.

Earlier tracked values may still exist in Git history. Current source cleanup does not
rotate deployed credentials or rewrite that history. Verify real deployments separately.
