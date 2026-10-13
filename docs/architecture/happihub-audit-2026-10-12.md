# HappiHub repository audit — 2026-10-12

## Scope and local synchronization

Fetched origin and fast-forwarded the local working branch. HEAD and origin/main both point to e3e90078920ee00c776c916ac7ede45e4e22cfc0, with no divergence. Working branch: docs/event-platform-conception. Existing untracked conception document preserved. No application changes, commits, pushes, or PRs.

Reviewed client routes/components, server routes/controllers/models/authentication/validation, manifests, test configuration, tracked environment-file presence, and repository layout. This is a source and local verification audit, not a deployed-site audit or exhaustive vulnerability scan. CodeRabbit CLI is unavailable; findings come from direct inspection and checks.

## Verified checks

- Locked dependencies installed in client and server with lifecycle scripts disabled. Lockfiles and manifests unchanged.
- Client production build succeeds with 11 ESLint warnings, outdated Browserslist data, and a Babel preset undeclared-dependency warning.
- Client test command exits 1: no tests found.
- Standard server test command exits 1: TypeScript Jest configuration requires missing ts-node.
- Diagnostic server command `./node_modules/.bin/jest --config '{}' --runInBand`: 4 suites and 25 tests pass. This bypasses repository configuration and is not equivalent to a passing standard command.
- Synthetic controller reproduction: a password verifier resolving false still produces HTTP 200 and a JWT. No real users, database, or credentials involved.
- Full application startup and database-backed flows were not verified. Dependency advisory/CVE analysis and live browser UX were not performed.

## Findings

| Priority | Finding | Evidence | Recommended treatment |
| --- | --- | --- | --- |
| P0 / Must Have | Password verification bypass | server/controllers/userController.js:52 calls asynchronous isValidPassword without await; server/models/userModel.js defines it async. Reproduced with synthetic data. | Await verification and add successful/failed login integration tests. |
| P1 / Must Have | Public registration permits admin role | server/validation/userValidation.js permits admin, server/controllers/userController.js:25 persists client role; signup route is anonymous. | Assign ordinary role server-side; keep privilege changes separately authorized. |
| P1 / Must Have | Private events exposed to arbitrary authenticated accounts | getEvents returns Event.find() and getEventsId has no privacy/ownership check. | Separate public and organizer queries and authorize each read. |
| P1 / Must Have | Client-controlled authorship | Event creator and comment author IDs come from request body. | Derive authorship from verified identity. |
| P1 / Must Have | Password hashes exposed in profile and logs | getUserProfile returns full user document; signup/login log it. Model has no password exclusion. | Project allowed response fields and remove sensitive logs. |
| P1 / Must Have | Missing auth header throws | auth.js calls replace on a possibly absent header before try/catch. | Parse defensively and return 401. |
| P2 / Must Have | Public route inaccessible | /:id precedes /public; both require authentication. | Define public routes explicitly before parameter routes and filter visibility. |
| P2 / Must Have | Creation crashes without token | EventCreate.jsx:15 decodes localStorage token during render without guarding absence or malformed values. | Guard private UI and handle expired/malformed sessions. |
| P2 / Must Have | Attendance workflow references absent field | eventController uses user.events.push, but User schema has no events field. Actor also supplied by client. | Decide attendance scope, then repair consistency and identity handling. |
| P2 / Should Have | Hardcoded API origins and nonexistent user lookup | EventCreate fetches /api/users/:id, but user routes only provide /profile and /role reads. | Centralize origin and use the existing authorized profile endpoint. |
| P2 / Should Have | Standard tests cannot run and lack behavior coverage | Missing ts-node, no client tests, server tests focus on input validation. | Repair runner separately and test auth/ownership/privacy/editor behavior. |
| P2 / Should Have | Environment files tracked | .env.development, .env.production, .env.test are tracked. Values were not disclosed in this audit. | Privately classify values as placeholders or real credentials before remediation; rotate only if actual exposure is confirmed. |
| P2 / Should Have | Server dependency manifest excessively broad | 374 declared dependencies, mirrored in lockfile, including many transitive/tooling packages. | Trace actual imports and propose scoped cleanup. No automatic dependency changes. |
| P3 / Nice to Have | UI and maintainability debt | Hook warnings, unused variables, default exports, hardcoded styles, raw IDs/dates in cards. | Address proportionally in modules touched by approved work. |

## Event editor inventory

Existing inputs: title, single-line description, date without time, free-text location, one image converted to a base64 string. Submission immediately creates an event. Error feedback is console-only; there is no persisted draft, edit flow, live preview, formatting interface, duplication, template selection, or AI feature.

The model enforces globally unique titles, required fields at creation, and moderation states pending/approved/rejected. These constraints should not silently become product requirements for the new editor. Image storage, timezone handling, repeated events, multi-session programs, publication rules, and revision behavior need explicit framing.

## Inputs for brainstorming

Start with a real event and then expand possibilities. Explore: intended creator and audience; event information versus page layout; structured content versus rich text; templates versus free layout; draft/save/recovery behavior; editing after publication; mobile creation; image crop and rights; schedules/timezones; collaboration; AI control; reusable content; and measurable success criteria.

Keep defect remediation separate from product choices. Do not select a new stack or implement the editor before the collaborative framing and conception validation.
