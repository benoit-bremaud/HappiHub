# Security repair package — 2026-10-12

Status: implemented locally on fix/security-boundaries following owner approval of focused repairs. No commit, push, PR, deployment, or remote issue closure.

## Changes

- Await actual password verification; use identical invalid-credential responses for unknown accounts and incorrect passwords.
- Reject administrator signup and persist ordinary role server-side. Password fields excluded by default; explicit selection for login only.
- Validate bearer syntax, signature algorithm, subject and expiry; reload account identity/role rather than trust stale role claims.
- Read access: approved non-private events are public, owners can read their own events, other private/pending reads fail with 404. No automatic approval or migration.
- Event lists exclude unauthorized objects; response projection excludes participant and creator identifiers.
- Comment reads/writes enforce associated-event visibility. Event/comment authors and participation identity come from authentication.
- Participation uses atomic addToSet on events; removes the broken dependency on an absent user.events field.
- Explicit profile mutation schema; bounded input strings and password UTF-8 byte limits. Only profile allowlisted fields returned.
- Remove sensitive browser/server logging in touched flows and replace internal exception responses with generic errors.
- Bound image payloads to 2 MiB decoded, allow PNG/JPEG/WebP signatures or HTTPS links without credentials. This is signature screening, not complete image decoding, dimension validation, malware scanning, remote-image verification or re-encoding.
- Separate Express construction from startup/database IO. Standard server test uses a CJS Jest config without introducing ts-node.
- Guard malformed/expired browser credentials and redirect event creation to login. Existing bearer/localStorage architecture unchanged.

## Verification

- Standard server npm test -- --runInBand: 50 tests across five suites pass.
- Client CI test: two tests pass, process exits zero. detectOpenHandles identifies a timer in existing CRA Babel dependency tooling.
- Client production build passes with existing/remaining lint and dependency-tooling warnings.
- git diff --check passes.
- HTTP tests exercise Express routes/middleware with database boundary stubs, plus real bcryptjs comparison. They do not prove real MongoDB persistence, transaction behavior, deployment configuration or browser flows.
- Direct review examined authentication, ownership filters, projections and input paths. CodeRabbit CLI unavailable.

## Behavior changes and remaining work

Pending events no longer appear to other accounts or anonymous visitors. There is no moderation approval endpoint in this increment; do not auto-approve existing data. Existing consumers expecting creator/attendee IDs must use an explicitly authorized future contract rather than public responses. Newly accepted image inputs are more restrictive. Passwords above 72 UTF-8 bytes are rejected; existing accounts using longer inputs may need a controlled recovery policy.

Session revocation/cookie design, rate limiting, security headers, dependency remediation, container/database configuration, tracked environment hygiene, deployment and security CI remain separate work. No claim of production readiness.

Working-directory Gitleaks scan found 11 pre-existing matches in client/test.rest and documentation, whereas the earlier local history scan reported zero. The REST token has a 2024 expiry; other examples still need private classification. No matches or credential values were reproduced in reports. Treat the previous zero result as limited evidence, not a clean-secret assurance.
