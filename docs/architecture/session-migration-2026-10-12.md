# Cookie-session migration — 2026-10-12

Status: implemented and verified locally on fix/security-boundaries. No deployment,
push, PR or merge is included in this result.

## Outcome

HappiHub now uses express-session 1.19.0 and connect-mongo 6.0.0 with its existing
MongoDB client. The coordinated client/server cutover removes bearer JWT issuance and
acceptance and browser localStorage credentials. React uses one session provider.
The historical JWT helper remains as a nonfunctional compatibility stub rather than
silently deleting its file. jsonwebtoken and jwt-decode dependencies were removed.

Login regenerates the identifier and CSRF token, then persists before success. Logout
revokes the current stored identifier. Password changes verify the current password and
atomically update the hash and authentication version, invalidating all existing sessions.
Current roles and account existence remain authoritative on protected requests.

CSRF and exact Origin/Referer checks apply to all writes, including anonymous login/signup.
Writes require JSON. Production uses a Secure HttpOnly SameSite=Lax __Host cookie, with
an explicit trusted Nginx IP and required external HTTPS gateway. Local HTTP uses a
separate non-Secure cookie name. Signing keys were freshly generated privately for
synthetic local/test fixtures, independently of the previous JWT keys.

## Local review and resolved findings

| Classification | Verified issue | Resolution |
| --- | --- | --- |
| Must Have | Mongo touch updates row expiry without updating serialized cookie expiry | Use store-controlled lastModified, touchAfter=1 second, and absolute deadline checks |
| Must Have | Saving a stale read session can upsert it after logout | Reads change only cookie metadata and use non-upserting touch, verified with concurrent read/logout |
| Must Have | Failed login persistence must not deliver an authenticated cookie | Clear/null the session on failure, return 503, verify only cookie deletion is delivered |
| Must Have | Secure cookies need a trustworthy production scheme | HTTPS fixture and exact proxy-IP trust, caller-supplied scheme overwritten by Nginx |
| Should Have | StrictMode can issue competing anonymous bootstrap requests | Deduplicate the provider's pending bootstrap request |
| Should Have | Network auto-allocation can take the configured gateway IP | Explicit Nginx/API IPs in a dedicated configurable subnet |
| Deferred | Existing CRA/Jest dependency findings | Separate major toolchain migration, not hidden by runtime audit results |

The review used source inspection, protocol tracing, failure/race tests and browser checks.
It is a local self-review, not an independent external review.

## Verification evidence

- Server fast suite: 86 tests passed, seven suites.
- Disposable real MongoDB 7.0.40 suite: 14 tests passed.
- Client suite: 18 tests passed, three suites.
- Client production build passed. Existing Card accessibility and Home unused-variable
  warnings remain, plus the legacy CRA/Babel dependency warning.
- Server production dependency audit: zero known vulnerabilities. Full server audit still
  reports 33 (5 moderate, 28 high); client audit 104 (3 low, 37 moderate, 64 high).
- Local Docker images and production runtime images rebuilt; both isolated stacks healthy.
- Local cross-origin browser check: bootstrap 200, signup 201, login 200, missing-CSRF write
  403, logout 204, subsequent profile access 401.
- Production HTTPS browser check: cookie Secure/HttpOnly/SameSite/Path verified, signup 201,
  login 200, profile 200, missing-CSRF event write 403, valid event creation 201, logout 204,
  subsequent profile access 401. No bearer response, no localStorage token, cookie hidden
  from document.cookie. This uses a disposable self-signed HTTPS gateway and a separate
  headless browser with certificate errors allowed solely for the fixture.
- An authenticated local Docker session survived an actual API container process restart.
- UI login, organizer controls, reload restoration and server-confirmed logout checked
  with the Chrome DevTools plugin on the standalone preview.
- Both Mermaid diagrams parsed, rendered and visually inspected. Source links checked.
- git diff --check passed.

## Acceptance and limits

[Specification](specs/cookie-sessions.md) and [ADR-0001](decisions/0001-server-managed-cookie-sessions.md)
record the accepted design. Idle lifetime is 30 minutes, authenticated absolute lifetime
is eight hours, anonymous bootstrap lifetime is 30 minutes. Store activity touches are
throttled to one second; this can shorten the idle window by at most approximately that
interval. TTL cleanup is asynchronous and does not grant authority. Already authorized
in-flight operations are not cancelled retrospectively by logout or password changes.

Bootstrap is limited to 120 and login to 20 requests per IP per 15-minute window.
Counters are process-local and reset on restart. They expire by window but have no strict
cap on distinct IPs. Multiple replicas require a shared limiter before deployment.

Private key rotation, real public TLS, deployment topology, backups, image scanning and
operational hardening are not established by this synthetic test. HttpOnly limits direct
credential reads but does not prevent an XSS script from making requests in a compromised
page. Native/API clients need cookie jars and CSRF rather than legacy bearer tokens.

## Retained local previews

Standalone preview: http://localhost:3100/events, disposable API on 5100.
Synthetic account: preview@example.com / Preview-only-123!.
Docker local preview: http://localhost:3200, API on 5200, retained local synthetic volume.
Choose one local preview per browser context: cookies are scoped to hosts, not ports.
The production validation stack and temporary HTTPS proxy were stopped after testing;
its synthetic volume was retained. No unrelated host services were stopped.

Visual redesign is deferred to the event-editor framing session, with Clément/Yazii's
feedback requested by the owner. The broader conception, UML and database review remain
separate from this authentication migration.
