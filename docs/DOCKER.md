# HappiHub Docker workflows

Dockerfiles and Compose describe the current implementation. Brick D moved the database to PostgreSQL. Neither this baseline nor passing tests authorizes production deployment.

## Images and contexts

Node 22.23.3, PostgreSQL 17.6 (alpine) and unprivileged Nginx images are pinned by manifest digest. Review and refresh those digests for future security patches; pinning does not eliminate image vulnerabilities. npm ci uses committed lockfiles with lifecycle scripts disabled. Node application targets run as node (UID 1000); static Nginx runs as UID 101. Production server installs only production dependencies and excludes test sources.

Both build contexts exclude environment files, host node_modules, output and test artifacts. Client API URL is public build configuration, never a secret. Production client uses /api and Nginx proxies to the internal server, preserving SPA fallback for direct links.

## Local stack

Create the ignored server/.env.docker.local file with a fresh private SESSION_SECRET_DEV (at least 32 random bytes). Compose supplies database URI, port and CORS origin. The local database has no authentication but is confined to an internal network without any host port. Use synthetic data only.

```sh
docker compose -p happihub-local build
docker compose -p happihub-local up -d --wait
```

Default web: http://localhost:3200. Default API: http://localhost:5200. Both bind host loopback. Override HAPPIHUB_LOCAL_WEB_PORT and HAPPIHUB_LOCAL_API_PORT together if needed. Browser URLs use localhost rather than Docker service names.

Client source/public directories are read-only bind mounts. Server currently uses image-baked source with Node watch; rebuild after host server changes. A future source-mount or development runner change is separate. Images contain their own node_modules, never host dependencies.

## Production baseline

Use only docker-compose.prod.yml, not an override of the local file. Choose a different Compose project name; local_postgres_data and prod_postgres_data are distinct named volumes.

Supply a private HAPPIHUB_SECRETS_DIR with files:

- session_key: fresh session signing key (independent of former JWT keys).
- postgres_user and postgres_password: database bootstrap identity.
- database_url: URL the API uses, postgres://<user>:<encoded-password>@postgres:5432/happihub.
  A least-privilege application role separate from the bootstrap identity is a follow-up.

Secret files must be readable by their container users. With file-backed Compose secrets, source-file permissions apply: do not assume uid/gid/mode remap the source. A tested local setup uses a mode-0700 host directory with mode-0444 files; only the needed files are mounted read-only into each service. Alternatively arrange explicit ownership/ACLs for UID 1000 (Node) and the PostgreSQL image runtime user. Never put these files in the repository or build contexts.

```sh
export HAPPIHUB_SECRETS_DIR=/absolute/private/path
export HAPPIHUB_PROD_ORIGIN=https://your-validated-domain.example
export HAPPIHUB_PROD_WEB_PORT=8080
export HAPPIHUB_TRUSTED_INGRESS_FILE=/absolute/operator/config/trusted-ingress.conf
docker compose -f docker-compose.prod.yml -p happihub-prod build
docker compose -f docker-compose.prod.yml -p happihub-prod config --quiet
```

Startup resolves mounted signing/database files at the server boundary. Run `npm run migrate` inside the API container before first use; schema changes are never applied at start. Changing files does not rotate existing database users; use an explicit coordinated rotation procedure. No existing volume is migrated automatically.

Only the static web service publishes a loopback port. API and database are internal. Database is on a separate internal network; client cannot directly reach it. Production requires an external HTTPS gateway in front of the loopback web port. Runtime Nginx overwrites X-Forwarded-Proto with https and the API trusts only Nginx's explicit IP. This is an ingress contract: never publish the HTTP web port directly. Secure cookies cannot authenticate an HTTP browser visit.

### Trusted client address

Before starting the production baseline, create an operator-owned configuration file outside
the checkout, using docker/nginx/trusted-ingress.conf.example as the syntax reference.
Replace its documentation address with the **exact controlled TLS gateway peer observed
by Nginx**. The file must contain one set_real_ip_from directive with an exact IPv4 or IPv6
address. Do not add unrelated directives, broad private ranges, wildcard trust or hop counts.
Docker NAT may make this peer the host bridge address; verify the actual topology with
synthetic traffic before deployment instead of assuming a public gateway address applies.
An exact host address still trusts processes on that host, not just the gateway program.

HAPPIHUB_TRUSTED_INGRESS_FILE must be an absolute path to that existing file, readable by
the unprivileged Nginx user. Compose mounts it read-only and will not create a missing host
path. The included image has no permissive default. Missing configuration prevents startup;
an empty trust file rejects API forwarding; invalid syntax/address fails nginx -t.

The controlled TLS gateway must overwrite X-Forwarded-For with its transport client's
literal IP (no port), set the approved Host and HTTPS scheme, and strip or overwrite
visitor-supplied forwarding headers. This baseline supports one outer gateway. A CDN,
additional proxy hop or alternative network route requires a separate trust review.

Nginx normalizes the client address with its real-IP module, then forwards exactly that
address to Express. It also overwrites X-Forwarded-Host and clears X-Real-IP and Forwarded.
Untrusted peers, missing/unparseable forwarded addresses, and a forwarded address equal to
the gateway itself receive 403 before the API. The root health check remains available.
Distinct client IPs receive distinct authentication quotas; people sharing a genuine NAT
IP still share a quota. No raw-IP debug endpoint is installed by this correction.

Validate nginx -t, independent quotas for two client IPs and spoofed-header rejection in
the intended topology before promotion. On failure stop promotion or restore a previously
verified safe ingress; never disable rate limits or enable blanket proxy trust as a workaround.
This correction does not authorize production deployment or a new transport-policy exception.

The production frontend network defaults to 10.254.240.0/28 and Nginx to 10.254.240.2. The API uses 10.254.240.3 to avoid an automatic allocation taking the gateway address. Override HAPPIHUB_FRONTEND_SUBNET, HAPPIHUB_PROXY_IP and HAPPIHUB_API_IP together if the subnet conflicts. The API TRUSTED_PROXY tracks that same address. The local stack trusts no forwarded scheme headers.

### Opt-in ingress regression

After building the production runtime images, run the disposable network test with their
actual image names (the command below uses the happihub-prod Compose project name):

```sh
python3 tools/ingress/test_ingress.py \
  --server-image happihub-prod-server \
  --nginx-image happihub-prod-client
```

Docker and OpenSSL are required. The test resolves image IDs once, mounts the current
application modules and production nginx.conf read-only, and uses an internal dual-stack
network without published ports. It creates an ephemeral TLS certificate, synthetic
sessions and an injected in-memory session store; no database or real credentials are used; `npm run test:integration` starts a disposable PostgreSQL container.
Only its labelled fixture resources are removed during cleanup. The fixture checks both
proxy hops, IPv4/IPv6 provenance, quota isolation, forged headers, Secure cookies and trust
file failures. It is separate from ordinary Jest/collector tests and is not a deployment test.

Backups/restores, resource limits, image scanning and deployment operations remain to be validated before real use. The old HTTP-only production smoke test does not validate cookie authentication. Cookie-session validation uses a disposable HTTPS gateway and isolated browser context.

## Health and lifecycle

PostgreSQL health uses pg_isready. API /ready runs a `SELECT 1` probe. Client health verifies HTTP serving. Compose waits for healthy dependencies before starting consumers. APIs and local client use init to forward signals.

Stop the chosen stack with docker compose -p <project> stop (include the production file where appropriate). Data volumes remain. Never use down -v against real data; deletion requires explicit approval.

## Verification performed

Local and production images built. Non-root app users, absence of environment files and omission of Jest in runtime image verified. Isolated local and production-baseline stacks tested with generated secrets and synthetic accounts. They do not attach existing volumes. Host ports 3000 and 8080 were occupied and left untouched; verification uses 3200/5200 and 3280.

## Scheduled maintenance

Run `npm run maintenance` from `server/` (or `docker compose exec server npm run maintenance`)
every hour from an external scheduler (cron or a systemd timer). No compose service runs it. It
sends verification reminders, deletes accounts never verified after 30 days, purges failed outbox
rows, expired tokens, activity older than 12 months and associations closed for 30 days. Without
it, none of these retention rules apply.
