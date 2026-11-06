# E2E and smoke tests on the local production build (#395)

This study defines the automated browser E2E and smoke suites that cover step 5 of the
pre-merge gate, run on the production client build in one local command.

Status: **validated by Benoît on 2026-11-06** (D1–D5 option A, top scores). This validates
the conception; the implementation follows in the same brick (AGENTS.md gate).

UML: [diagrams/e2e-smoke-tests/](../diagrams/e2e-smoke-tests/).
Related: [test environment](test-environment.md) (demo seed, § 9 deferred this suite),
[public agenda](public-agenda.md), [brick B](v1-brick-b-event-lifecycle.md),
[brick D](v1-brick-d-accounts-associations.md), [cookie sessions](cookie-sessions.md), issue #395.

## 1. Goal and scope

Every merge so far reported gate step 5 ("automated E2E/smoke on the local prod build") as
*not covered*. This brick adds:

- a **smoke suite**: the production client build and the API, against a disposable PostgreSQL,
  answer at all (home page renders, `GET /api/session` answers 200);
- an **E2E suite**: four user journeys driven in a real browser (§ 4);
- **one local command** that builds, starts, runs both suites and tears everything down,
  documented in CONTRIBUTING.md and named by the gate step 5.

Out of scope: running the suite in GitHub CI (a CI/CD change needing its own authorization,
follow-up issue), the Docker production stack with nginx and TLS (staging, #386), visual
regression, cross-browser matrices, load testing, the rejection catalogue (already integration
tests, test-environment § 5).

Test pyramid: the suite stays small (smoke 2 checks, E2E 4 journeys). Rules and error branches
remain in unit and integration tests; E2E only proves the assembled product works end to end.

## 2. Topology (what runs during a test run)

| Part | How it runs | Tier / settings |
| --- | --- | --- |
| PostgreSQL | disposable container, same pinned image as the integration harness, `--tmpfs` data, random loopback port, database `happihub_e2e_demo` | removed at teardown |
| Field keyring | generated per run with `npm run keyring:generate` into a temporary directory | deleted at teardown |
| API | `server/`: `npm run migrate`, `npm run seed:demo -- --confirm`, then `node server.js` on port 5100 (all interfaces: `server.js` has no host setting) | DEV tier (`NODE_ENV` unset): log email transport, non-`Secure` cookie on plain HTTP; `APP_URL_DEV=http://localhost:3100` |
| Client | `client/`: `npm run build` with `REACT_APP_API_URL=http://localhost:5100/api`, `GENERATE_SOURCEMAP=false`, `INLINE_RUNTIME_CHUNK=false` (same build flags as the Docker image) | static production bundle |
| Static server | small Node script in `e2e/` serving the bundle built into `e2e/.run/build` on port 3100, loopback only with the SPA fallback to `index.html` | no dependency |
| Browser | Playwright Chromium, headless | — |

Why DEV and not `NODE_ENV=production` for the API: production mode refuses the log email
transport (`createLogTransport`) and sets `Secure` cookies, which a plain-HTTP localhost run
cannot carry; there is no email provider yet (T11). The **client** is the real production
bundle; the API code is identical in every tier, only configuration differs. The production
edge (nginx, TLS, trusted ingress, security headers) is checked on staging (#386), not here.

All secrets (session secret, database password) are generated per run in memory and passed
through the child process environment; nothing is written to `server/.env*` or committed.

## 3. Location and command (D2, D5)

A new root folder `e2e/` with its own `package.json` and lockfile, like `client/` and
`server/` (the repository still has no root `package.json`):

```
e2e/
  package.json          # @playwright/test only; scripts: test, smoke
  package-lock.json
  playwright.config.js  # projects "smoke" and "e2e", globalSetup
  globalSetup.js        # container, keyring, migrate, seed, build, start API + static server;
                        # returns the teardown (stop processes, remove container and run folder)
  serveBuild.js         # static server with SPA fallback
  support/              # mail log reader, persona credentials reader
  tests/smoke.spec.js
  tests/journeys/*.spec.js
```

Command, from `e2e/` (first run: `npm ci --ignore-scripts && npx playwright install chromium`):

```bash
npm test
```

It runs the `smoke` project first, then `e2e` (Playwright project dependency: if smoke fails,
the journeys are skipped). `npm run smoke` runs the smoke project alone. Prerequisites: Docker
(as for `npm run test:integration`), `npm ci` already done in `client/` and `server/`.
Exit code 0 means gate step 5 is green.

## 4. Journeys (E2E suite)

Each journey maps to a validated use case. Selectors use roles and accessible names
(`getByRole`, `getByLabel`), never CSS classes, so the tests also guard accessibility.

| Id | Journey | Data | Expected |
| --- | --- | --- | --- |
| J-E2E-1 | Sign-up and email verification (UC1–UC2) | new address `e2e-<run>@demo.example.com`, generated password | sign-up accepted; the verification link is read from the API log (§ 5); opening it verifies the account; sign-in then succeeds |
| J-E2E-2 | Sign-in and sign-out (UC3) | seeded persona Claire (P1) | wrong password shows the neutral error; right password opens the signed-in area; sign-out returns to the visitor view |
| J-E2E-3 | Event creation and publication (UC15, UC17) | Claire, association A1 | a draft is created, edited, previewed and published; it appears on the public agenda |
| J-E2E-4 | Public agenda as a visitor (UC21) | demo seed events | the home page lists published future events; drafts (E15) and the hidden event (E19) are absent; an event page opens |

Journeys run serially with one worker (shared database, sign-in rate limits). J-E2E-3 publishes
with a start date computed from the run date, so it stays in the future.

## 5. Reading the verification email (D3)

The API runs with the log transport, which prints each email and its link on stdout.
`globalSetup` starts the API as a child process and appends its stdout to a run log file;
`support/mailLog.js` waits (with a timeout) for the line carrying the verification link for
a given recipient and returns the URL. The test then opens that URL in the browser exactly as a
user would click it. No test-only endpoint, no database read, no production code change.

## 6. Test data and credentials (D4)

The #251 demo seed is reused unchanged: the run database is named `happihub_e2e_demo` on a
loopback port with `--confirm`, which satisfies every seed guard (test-environment § 2).
Persona passwords are read from the `server/.demo-credentials.local.json` file the seed writes.
The seed keeps the passwords of an existing file and creates it otherwise (N3), so a run never
changes a developer's passwords. Passwords never appear in test names, logs or reports:
Playwright traces are off because they would record the typed values; only failure screenshots
(password fields masked by the browser) are kept under the ignored `e2e/test-results/`.

## 7. Smoke suite

| Id | Check | Expected |
| --- | --- | --- |
| S1 | `GET http://localhost:5100/api/session` with the web `Origin` | 200, JSON body, no account, a CSRF token (N1) |
| S2 | open `http://localhost:3100/` | 200, the HappiHub heading renders, no uncaught page error, `GET /api/events` answers 200 (N2) |

## 8. Gate integration

- CONTRIBUTING.md § Verification gains the `e2e/` command.
- The pre-merge gate step 5 (review-local) records the `npm test` result from `e2e/`
  instead of "not covered".
- `.gitignore` adds `e2e/test-results/`, `e2e/playwright-report/` and `e2e/.run/`.
- SonarQube: `e2e/` is test code (`sonar.tests`), excluded from coverage.
- Follow-up issue (not this brick): run the suite in GitHub CI (needs CI/CD authorization).

## 9. Decisions (MCDA)

Scores 0–5, weights /100, totals /500. Sensitivity: each pair of weights shifted by ±10;
"kept" means the winner stays first.

### D1 — runner

| Criterion (weight) | A Playwright | B Cypress | C Puppeteer + Jest |
| --- | --- | --- | --- |
| Fit for real browser journeys and server start (30) | 5 `webServer`, projects, traces | 4 | 2 hand-rolled |
| Reliability (auto-wait, isolation) (25) | 5 | 4 | 2 |
| Simplicity / setup (20) | 4 | 3 heavier binary, app-in-iframe | 3 |
| Accessibility-first selectors (15) | 5 `getByRole` built in | 3 plugin | 2 |
| Ecosystem / docs freshness (10) | 5 | 4 | 3 |
| **Total** | **480** | 370 | 220 |

Sensitivity: A first for every shift.

### D2 — location

| Criterion (weight) | A root `e2e/` package | B inside `client/` | C inside `server/` |
| --- | --- | --- | --- |
| Separation of concerns (whole-system tests) (30) | 5 | 2 | 2 |
| No impact on existing suites and lockfiles (25) | 5 | 2 CRA Jest picks up `*.spec.js` | 3 |
| Consistency with repo layout (20) | 4 same pattern as client/server | 4 | 3 |
| Simplicity (one more install) (25) | 3 | 4 | 4 |
| **Total** | **430** | 285 | 285 |

Sensitivity: A first unless simplicity weighs 50 or more.

### D3 — getting the verification link

| Criterion (weight) | A parse the API log transport output | B decrypt the outbox row with the run keyring | C test-only endpoint |
| --- | --- | --- | --- |
| No production code change (30) | 5 | 5 | 0 |
| Black-box fidelity (25) | 5 same path as a developer | 3 | 3 |
| Simplicity (25) | 4 | 2 cipher, SQL, timing with delivery | 4 |
| Security (20) | 5 | 4 test holds keyring logic | 1 new surface |
| **Total** | **470** | 360 | 195 |

Sensitivity: A first for every shift.

### D4 — test data

| Criterion (weight) | A reuse the #251 demo seed on a disposable `_demo` DB | B fixtures created by the tests through the UI/API | C dedicated SQL fixture |
| --- | --- | --- | --- |
| Fidelity (encryption, real services) (30) | 5 | 5 | 1 |
| Speed / reliability (25) | 4 | 2 rate limits on sign-up | 5 |
| No duplication of data definitions (25) | 5 | 3 | 1 |
| Simplicity (20) | 4 | 3 | 3 |
| **Total** | **450** | 335 | 245 |

Sensitivity: A first for every shift. J-E2E-1 still creates its own account (it tests sign-up).

### D5 — what "production build" covers

| Criterion (weight) | A prod client bundle + API in DEV tier, Node static server | B full Docker prod stack (nginx, prod API) | C CRA dev server |
| --- | --- | --- | --- |
| Gate fidelity (prod bundle) (30) | 4 bundle real, edge on staging | 5 | 0 |
| Feasible now (email, TLS, cookies) (30) | 5 | 1 needs TLS edge, email provider (T11) | 5 |
| Speed / local run (20) | 4 | 2 image builds | 4 |
| Simplicity (20) | 4 | 1 | 5 |
| **Total** | **430** | 250 | 340 |

Sensitivity: A first unless gate fidelity weighs 60 or more (B then needs T11 resolved anyway).

## 10. Acceptance criteria

- AC1: from a clean checkout with Docker, `npm ci` in client/, server/, e2e/ and the Chromium
  install, `npm test` in `e2e/` builds, starts, runs smoke and E2E, exits 0, and leaves no
  container, process or temporary file behind (also after a failure or Ctrl-C).
- AC2: smoke S1–S2 and journeys J-E2E-1 to J-E2E-4 pass.
- AC3: if the smoke fails, the journeys are reported as skipped and the command exits non-zero.
- AC4: no secret or password is committed, logged or present in the report; `git status` stays
  clean after a run (apart from ignored folders).
- AC5: the existing server and client test suites are unchanged and still pass.
- AC6: CONTRIBUTING.md documents the command; the gate step 5 uses it.

## 11. Implementation notes (2026-11-06)

Gaps found while coding; none changes a decision or production code.

- **N1 (S1 origin)**: `GET /api/session` issues the CSRF token and answers 403 to a request
  without the configured web origin. S1 sends `Origin: http://localhost:3100`, as the browser does.
- **N2 (S2 errors)**: Chromium logs `net::ERR_NETWORK_CHANGED` while Docker adds network
  interfaces, which made a "no console error" check flaky. S2 fails on uncaught page errors
  (`pageerror`) and checks that the agenda request (`GET /api/events`) answers 200 instead.
- **N3 (credentials file, § 6)**: no backup is needed. The seed keeps the passwords of an
  existing `server/.demo-credentials.local.json` and creates the file otherwise, so a run never
  changes a developer's passwords; the file stays ignored by git.
- **N4 (build output)**: the client bundle is built into `e2e/.run/build` (`BUILD_PATH`), so a
  developer's `client/build` is left untouched; the run folder is deleted at teardown.
- **N5 (default exports)**: Playwright loads its configuration and global setup from default
  exports only; both modules also export the value by name and comment the exception.
- **N6 (review-local round 1)**: setup failures report their cause (the migration error, the
  API log tail, an exited child process) before the run folder is deleted; the static server
  answers 400 to a malformed URL and 404 to a missing asset; paths use `fileURLToPath`, so a
  checkout path with spaces works. The command is POSIX only (Linux/macOS, as the Docker harness).
- **N7 (API binding)**: the API listens on every interface during a run, because `server.js`
  takes no host setting; a loopback-only option is a follow-up issue, not this brick.
- Playwright is pinned to 1.64.1 (released 2026-10-14) with its own lockfile in `e2e/`.
