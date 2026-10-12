# Cookie sessions — proposed security migration

Status: validated by the owner on 2026-10-12; implemented and locally verified. See the session migration report for evidence and limits.
Work item: this specification records the locally approved design investigation.
Scope: replace browser bearer JWT authentication without redesigning event creation.

## Need and observable outcomes

The browser currently persists a bearer JWT in localStorage. Logout only removes that
browser value. Replace it with an opaque cookie identifier and a revocable server session.
MongoDB remains the existing persistence choice, pending the later product conception review.

UC1 — Sign in and access the organizer tools. A visitor submits valid credentials,
receives a new session identifier, and sees the server-confirmed account projection.
Invalid credentials leave the visitor anonymous and return a generic error.

UC2 — Resume an authenticated visit. A browser reload obtains the current account
from the server. Expired, revoked, or deleted accounts cannot access protected endpoints.

UC3 — Sign out and revoke access. The server destroys the current stored session before
confirming logout. Subsequent requests using that identifier cannot authenticate.
Already authorized in-flight operations are not retrospectively cancelled.

UC4 — Change a password and invalidate existing sessions. The account owner supplies
the current password and a valid replacement. An atomic account update increments the
authentication version with the password change. All existing authenticated sessions,
including the current one, become invalid. The user signs in again.

## Proposed decisions

- D1: use express-session with connect-mongo, an injected store, and the existing Mongo
  client where supported by the selected compatible releases. No production MemoryStore.
  Verify package versions, Node 22 compatibility, driver compatibility, and dependency
  audit before installation. No additional Redis service or repository layer.
- D2: cookie stores only the signed opaque identifier. Production cookie name is
  `__Host-happihub.sid`, HttpOnly, Secure, SameSite=Lax, Path=/, with no Domain.
  Local HTTP uses `happihub.sid` without Secure. Production requires a verified HTTPS
  entry point and narrowly configured trusted proxies, never an automatic insecure fallback.
- D3: 30-minute idle and eight-hour absolute authenticated lifetime. These are internal
  proposed product defaults, not values mandated by OWASP. Check expiry on every
  authenticated request independently of delayed Mongo TTL cleanup. Cap cookie/store
  expiry at the absolute deadline. Avoid lazy store touches that outlast the idle deadline. connect-mongo exposes its store-controlled lastModified with touchAfter=1 second; use it to evaluate idle expiry because touch does not rewrite the serialized cookie. Cookie-only changes use store.touch without upsert, so concurrent reads cannot restore a destroyed identifier.
- D4: persist user ID, authentication version, login timestamp, and CSRF secret/token.
  Load the current account and role on protected requests. Never persist passwords or
  cache an authoritative role in the session. Existing users without authVersion start at 0.
- D5: a public session bootstrap endpoint initializes a short-lived anonymous session
  only when requested, returning a session-bound CSRF token. Ordinary public event API reads
  do not create session records. The React session bootstrap does initialize a visit. Anonymous bootstrap lifetime is 30 minutes, not rolling.
  Responses carrying session/account/CSRF data use Cache-Control: no-store.
- D6: require a cryptographically random session-bound synchronizer token in
  X-CSRF-Token on every POST/PUT/PATCH/DELETE, including signup, login and logout.
  Validate the exact configured Origin, with exact Referer-origin fallback when absent,
  and reject when neither is available. Restrict accepted body types to the documented
  JSON contract. Do not use SameSite or CORS as the sole CSRF control.
- D7: regenerate the identifier and CSRF token after successful credential verification.
  Save the authenticated session before sending success. Destroy before confirming logout
  and clear the cookie using matching path/security settings. Storage failure returns 503,
  not a success response. Do not log cookie IDs, CSRF tokens or passwords.
- D8: remove bearer authentication in the coordinated client/server cutover. Old JWTs
  no longer authenticate and existing browser users must sign in again. Remove only the
  legacy localStorage token key during client startup. Do not clear unrelated storage.
- D9: use one React session provider for loading, anonymous, authenticated and unavailable
  states. Keep CSRF token in memory. apiFetch includes credentials and attaches CSRF only
  to writes. Preserve AbortSignal, never automatically replay writes, and handle a stale
  CSRF token by prompting refresh/retry rather than resubmitting a mutation silently.
- D10: rate-limit anonymous bootstrap and login to bound record creation and password
  guessing. Initial deployment is one API instance: bounded in-process IP counters are
  acceptable with the restart limitation documented. Return 429 with Retry-After.
  Limits: bootstrap 120 and login 20 requests per IP per 15-minute window. In-process counters expire by window but do not impose a strict cap on distinct IPs.
  Multiple replicas require a shared limiter before deployment. Account lockout, MFA,
  refresh tokens, device lists, and remember-me are outside this migration.

## HTTP contracts

| Endpoint | Authentication / CSRF | Result |
| --- | --- | --- |
| GET /api/users/session | Public, exact-origin browser access | 200 `{ user: null or projection, csrfToken }`, initializes anonymous session if necessary |
| POST /api/users/login | Anonymous session and CSRF | 200 `{ user, csrfToken }`, new cookie and identifier, no JWT |
| POST /api/users/signup | Anonymous session and CSRF | Existing 201 contract, remains anonymous |
| POST /api/users/logout | Session and CSRF | 204 after destruction, clears cookie |
| PUT /api/users/profile | Authenticated and CSRF | Existing projected profile for ordinary updates |
| PUT /api/users/profile with password | Authenticated, CSRF, currentPassword | 200 profile after atomic password/version update, session cleared, sign-in required |

Bootstrap replaces invalid/expired cookies with anonymous state, never authenticated
state. Protected endpoints return 401 for missing/invalid authentication, 403 for rejected
CSRF/origin, and 503 for session-store/account lookup unavailability. Ordinary optional-auth
public reads may proceed anonymously after expiry. A valid owner session continues to use
the existing event visibility rules. Malformed credentials never grant owner access.

Session identifiers and tokens are sensitive, user ID/email/name are personal data.
Browser-to-API production traffic requires TLS. Mongo traffic stays on the private
database network. A database compromise remains a session risk, and HttpOnly does not
prevent malicious scripts from issuing requests in a compromised page.

## Implementation plan and dependencies

1. Server: add session composition in `server/config/session.js`, pure deadline policy in
   `server/utils/sessionPolicy.js`, and CSRF middleware in `server/middleware/csrf.js`.
   Update app.js, server.js, appConfig.js, auth.js, userController.js, userRoutes.js,
   userModel.js and userValidation.js. Keep the store and clock injectable for tests.
   Retire JWT helper/dependencies only after all consumers have migrated and owner has
   approved file deletion. Retain event-access helpers and their ownership rules.
2. Client: replace session.js JWT decoding with session state/provider, update api.js,
   App.js, Connexion, Logout, Profil, Event, EventInfo, EventCreate and Comment.
   Bootstrap before displaying protected controls, render loading and unavailable states,
   update login/logout without full-page reload, preserve public browsing.
3. Configuration: replace JWT signing keys with a new independently generated session
   signing secret and optional rotation keys. Update .env.example, both Compose files,
   Docker startup secret resolution, API/configuration/Docker docs and REST examples.
   Do not expose the signing secret to the client. Production browser verification needs
   a temporary HTTPS proxy fixture, since the existing HTTP container smoke test cannot
   validate Secure cookies. No CI/CD pipeline changes in this plan.
4. Verification: adapt fast tests, real-Mongo integration tests and client contract tests;
   add browser cookie/CSRF scenarios and repeat local and production container smoke tests.
   A persistent store surviving API restart must preserve eligible sessions.

## Acceptance criteria and traceability

| Requirement | Verification |
| --- | --- |
| R1: no browser-persisted bearer credentials | Client tests and browser storage inspection |
| R2: fixation prevention and logout revocation | Cookie jar tests verify ID rotation and replay rejection |
| R3: idle/absolute expiry despite TTL delay | Injected-clock policy tests and real Mongo expired records |
| R4: CSRF on all writes, including login/signup | Missing, wrong, foreign-origin, and rotated-token cases |
| R5: current account/role/version authoritative | Deleted user, role change and password revocation tests |
| R6: fail closed on storage outage | Protected requests and login/logout return 503, UI unavailable state |
| R7: public browsing preserved | Anonymous public event/comment reads and pending/private denial |
| R8: local and production cookies behave correctly | Local cookie jar, production HTTPS browser test, proxy spoof rejection |
| R9: no races silently restore logged-out authority | Concurrent read/logout test and replay rejection, no automatic write retries |
| R10: request/record creation bounded | Bootstrap/login 429 tests and Retry-After behavior |

The linked sequence view covers UC1/UC2/UC3 and R2/R4/R6. The session-state view covers
R3/R5. Structural boundaries remain browser provider -> API middleware/controllers ->
session store/account persistence. Pure session policy depends only on explicit values
and time, not Express or MongoDB. No new domain entities require a class diagram.
The textual use cases and personal-data description above cover actor goals and data
classification without duplicating the HTTP protocol in further diagrams.

## Four-pass conception review

- Requirements: contracts and tests cover authentication, revocation, expiry, CSRF,
  outages and public access. Product editing/conception remains a separate workstream.
- Clean/SOLID: session setup is infrastructure at the composition root, expiry decisions
  are pure, auth/CSRF middleware each have one responsibility, UI consumes one session API.
- KISS/YAGNI/DRY: reuse Mongo and maintained session middleware, avoid a second database,
  speculative ports, token-refresh machinery and duplicated login-state decisions.
- Pattern fit: injection is justified by real store/time test seams. No new service stack.
  Review concurrent requests explicitly rather than assuming regeneration/destroy alone
  solves every race. Password/version update must be atomic.

## References

- [express-session documentation](https://github.com/expressjs/session#readme)
- [connect-mongo documentation](https://github.com/jdesboeufs/connect-mongo#readme)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

Related visual views: [sequence](../diagrams/cookie-sessions/02-sequence-authentication.md)
and [state](../diagrams/cookie-sessions/05-state-session.md).
