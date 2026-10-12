# HappiHub Docker workflows

Dockerfiles and Compose describe the current implementation. MongoDB will be reconsidered during conception. Neither this baseline nor passing tests authorizes production deployment.

## Images and contexts

Node 22.23.3, MongoDB 7.0.40 and unprivileged Nginx images are pinned by manifest digest. Review and refresh those digests for future security patches; pinning does not eliminate image vulnerabilities. npm ci uses committed lockfiles with lifecycle scripts disabled. Node application targets run as node (UID 1000); static Nginx runs as UID 101. Production server installs only production dependencies and excludes test sources.

Both build contexts exclude environment files, host node_modules, output and test artifacts. Client API URL is public build configuration, never a secret. Production client uses /api and Nginx proxies to the internal server, preserving SPA fallback for direct links.

## Local stack

Create the ignored server/.env.docker.local file with a private JWT_SECRET_DEV and JWT_EXPIRATION_DEV=1h. Compose supplies database URI, port and CORS origin. The local database has no authentication but is confined to an internal network without any host port. Use synthetic data only.

```sh
docker compose -p happihub-local build
docker compose -p happihub-local up -d --wait
```

Default web: http://localhost:3200. Default API: http://localhost:5200. Both bind host loopback. Override HAPPIHUB_LOCAL_WEB_PORT and HAPPIHUB_LOCAL_API_PORT together if needed. Browser URLs use localhost rather than Docker service names.

Client source/public directories are read-only bind mounts. Server currently uses image-baked source with Node watch; rebuild after host server changes. A future source-mount or development runner change is separate. Images contain their own node_modules, never host dependencies.

## Production baseline

Use only docker-compose.prod.yml, not an override of the local file. Choose a different Compose project name; local_mongo_data and prod_mongo_data are distinct named volumes.

Supply a private HAPPIHUB_SECRETS_DIR with files:

- jwt_key: signing key.
- mongo_root_user and mongo_root_password: database bootstrap administration identity.
- mongo_app_user and mongo_app_password: separate application identity.
- mongo_uri: URI for the application identity, mongodb://<app-user>:<encoded-app-password>@mongo:27017/happihub?authSource=happihub.

Secret files must be readable by their container users. With file-backed Compose secrets, source-file permissions apply: do not assume uid/gid/mode remap the source. A tested local setup uses a mode-0700 host directory with mode-0444 files; only the needed files are mounted read-only into each service. Alternatively arrange explicit ownership/ACLs for UID 1000 (Node) and the Mongo image runtime user. Never put these files in the repository or build contexts.

```sh
export HAPPIHUB_SECRETS_DIR=/absolute/private/path
export HAPPIHUB_PROD_ORIGIN=https://your-validated-domain.example
export HAPPIHUB_PROD_WEB_PORT=8080
docker compose -f docker-compose.prod.yml -p happihub-prod build
docker compose -f docker-compose.prod.yml -p happihub-prod config --quiet
```

Startup resolves mounted signing/database files at the server boundary. The API receives readWrite access only to happihub, not Mongo root credentials. Application-user bootstrap runs on first initialization only. Changing files does not rotate existing database users; use an explicit coordinated rotation procedure. No existing volume is migrated automatically.

Only the static web service publishes a loopback port. API and database are internal. Database is on a separate internal network; client cannot directly reach it. Public TLS/reverse proxy, backups/restores, resource limits, image scanning, deployment operations and session hardening remain to be validated before real use. HTTP origin was used only for disposable verification.

## Health and lifecycle

Mongo health uses a ping. API /ready reports established Mongoose connection state, not an active query probe. Client health verifies HTTP serving. Compose waits for healthy dependencies before starting consumers. APIs and local client use init to forward signals.

Stop the chosen stack with docker compose -p <project> stop (include the production file where appropriate). Data volumes remain. Never use down -v against real data; deletion requires explicit approval.

## Verification performed

Local and production images built. Non-root app users, absence of environment files and omission of Jest in runtime image verified. Isolated local and production-baseline stacks tested with generated secrets and synthetic accounts. They do not attach existing volumes. Host ports 3000 and 8080 were occupied and left untouched; verification uses 3200/5200 and 3280.
