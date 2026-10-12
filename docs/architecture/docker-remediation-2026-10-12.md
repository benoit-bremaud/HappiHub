# Docker remediation verification — 2026-10-12

Approved local stack and production baseline implemented on fix/security-boundaries.

Images pinned to verified registry digests: Node 22.23.3, MongoDB 7.0.40, unprivileged Nginx. Separate local/runtime targets, npm ci with scripts disabled, private build contexts, non-root application processes, prod server dependency pruning and static client serving.

Separate Compose configurations, project-scoped local/prod volumes, internal database network, loopback-only published ports and dependency health ordering. Production credentials use mounted files; Mongo bootstrap creates a database-scoped readWrite application account. Startup loads mounted files at the IO boundary. API readiness reflects Mongoose connection state.

## Verified

- Local and production images build.
- Both isolated stacks reach healthy states.
- Signup 201, login 200, creation 201, owner detail 200, anonymous pending detail 404 in both stacks.
- Production SPA direct link returns 200 through static Nginx.
- Application users: Node UID 1000, Nginx UID 101. Production API administrative database command denied (code 13).
- Server runtime image contains no environment files and no Jest.
- 65 fast tests and 11 real-database integration tests pass.
- Compose config and diff whitespace checks pass.

Initial prod fixture secret files were unreadable to container users; corrected disposable file permissions. Host fixture directory remains mode 0700, mounted files mode 0444; documentation explains Compose bind-backed permissions. Port 8080 was occupied; used 3280 without stopping its owner. Existing host services/volumes untouched.

Production verification stack stopped afterward; its synthetic volume retained. Local Docker stack remains on 3200/5200. Earlier non-Docker preview remains on 3100/5100. Neither is a deployed service.

## Limits

Not production approval. TLS termination, image vulnerability scanning, backup/recovery, resource policies and sessions remain outstanding. Initializers do not rotate existing database users. Local Mongo is unauthenticated but internal-only and intended for fake data. Current database remains subject to conception review. Node watch local server uses image source, so host backend edits require rebuild. No push or PR.
