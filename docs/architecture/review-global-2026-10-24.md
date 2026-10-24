# Global local review — HappiHub (whole repository)

- Date: 2026-10-24
- Commit: 8e501f6 (`docs/244-partner-api-study`, application code identical to main `9cb6a3d`)
- Scope: whole repository, read-only
- Checks run: security (Opus) · design and correctness · test quality and documentation · every test suite
- Verdict: no blocking security flaw; 2 correctness Must and 2 CI Must to plan  ·  Must 4 · Should 13 · Nice 9

## Execution

| Step | Result |
|---|---|
| Quality collector tests (Python) | ✅ 20 / 20 |
| Server unit | ✅ 142 / 142 |
| Server integration (PostgreSQL, Docker) | ✅ 111 / 111, coverage 91.0 % stmts / 73.1 % branches / 96.5 % funcs / 93.7 % lines |
| Server unit, full file set (incl. domain, services, db, jobs) | 49.4 % stmts / 55.0 % branches / 36.3 % funcs / 50.2 % lines (unit only; integration carries the services) |
| Server, CI globs | 61.9 % stmts (wrong file set, see M3) |
| Client | ✅ 84 / 84, 92.6 % stmts / 82.0 % branches / 93.6 % funcs / 96.1 % lines |
| Client build | ✅ compiled |
| Secrets | ✅ gitleaks clean on the branch; no tracked env file |
| SonarQube | last recorded analysis of `happihub` OK (new coverage 94.4 %, 0 violations); no fresh scan |

## 🔴 Must Have

- `server/jobs/maintenance.js:40-43` `[correctness]` · The unverified-account purge selects outside a transaction and `deleteAccountRow` does not recheck `email_verified_at`: an account verified between scan and delete is deleted; the reminder loop has the same check-then-act race and counts scanned rows · Recheck `email_verified_at IS NULL FOR UPDATE` per row, count real deletions (verified in code). #328.
- `server/controllers/accountController.js:131-138` `[security|correctness]` · Current-password limit checked before a ~250 ms bcrypt and counted after: parallel requests with a stolen session bypass the 5 / 15 min quota (UC4 2a, UC6 2b); `PATCH`/`DELETE /account` have no per-IP limiter · Reserve the attempt before comparing, release on success (needs a spec note). #329.
- `.github/workflows/quality-tests.yml:33-37` `[tests]` · Coverage globs name missing folders (`models`, `queries`, `validation`) and omit `domain`, `services`, `db`, `jobs`: the CI and Sonar coverage figure measures the wrong files · Use the `jest.config.cjs` file set. #295, raised to P1 (CI change needs owner approval).
- `.github/workflows/quality-tests.yml` `[tests]` · CI never runs the 111 PostgreSQL integration tests that hold authentication, membership authorization, event merge, encryption and maintenance · Add a PostgreSQL service step and publish its lcov. #307, raised to P1.

## 🟡 Should Have

- `server/services/invitations.js:125-138` `[correctness]` · Accept locks invitation then association (FK), resend and close lock association then invitation: deadlock → bare 500 · Fixed lock order. #298.
- `server/jobs/maintenance.js:17-51` `[correctness]` · One failing row stops every later maintenance task, every run · Per-row/per-task isolation with a failure count. #330.
- `server/utils/keyedLimiter.js:6-13` `[security|correctness]` · Limiter map never evicts; the recipient limiter keeps plaintext emails in memory until restart · Evict expired entries. #331.
- `server/controllers/handle.js:8`, `server/app.js:78-80` `[correctness]` · Unexpected 500s are not logged · Privacy-safe log line. #231.
- `docs/API_DOCUMENTATION.md:37` `[docs]` · `PATCH /associations/:slug` documented 200, returns 204; client test mocks 200 · Fix doc and mock. #333.
- `docs/API_DOCUMENTATION.md:106-107` `[docs|design]` · Middleware refusals (401, 403 CSRF, 404 non-member, 415, 429) carry no `code` on brick B routes · Decide in the #244 implementation (partner clients branch on `code`).
- `client/src/events/eventFields.js:79-100` `[design]` · Event times use the browser zone; overseas communes are in the list; no spec defines the zone · Conception decision. Extend #304.
- `server/routes/api.js:25,28,46,47` `[security]` · Token endpoints (verification, reset confirm, invitation lookup/accept) have no rate limiter (DoS hardening) · IP limiter. #332.
- `.github/workflows/`, `.github/dependabot.yml` `[security]` · No gitleaks, CodeQL, dependency review, Trivy/Hadolint, Dependabot · #25.
- `client/package.json` `[security]` · CRA toolchain unmaintained · #248.
- `server/app.js:32-58` `[security]` · `X-Powered-By`, no `nosniff` on direct API access · #321. Unknown `/api` routes answer HTML 404 · #322.
- `client/src/events/events.test.jsx:37,215` `[tests]` · `Date.now` spy never restored: order-dependent tests · `jest.restoreAllMocks()` in `afterEach`. #334.
- `server/jest.config.cjs`, `client/package.json` `[tests]` · No coverage thresholds · Add after the glob fix. #272.
- `server/services/errors.js`, `jobs/migrate.js`, `jobs/runMaintenance.js`, `jobs/runReencrypt.js`, `domain/passwordBlocklist.js` `[docs]` · No doc comments · #295.

## 🔵 Nice to Have

- `server/tests/integration/migrations.test.js:45,46,75`, `tests/unit/domain.test.js:45` `[tests]` · Weak `toBeDefined` assertions.
- `server/jobs/runMaintenance.js:8,17` `[design]` · Imports `createLinks` from `app.js`; recipient quota restated · Move to `config/links.js`.
- `server/domain/event.js:10` and two others `[design]` · `DAY_MS` three times · #298.
- `server/app.js:54-55` `[design]` · Session deadline recomputed · Use `sessionDeadline`; #263 is stale and needs re-triage.
- `server/services/outbox.js:60-62` `[security]` · Dev log transport prints live tokens · Document; #231.
- `server/config/session.js:7-9` `[security]` · No `__Host-` cookie prefix guarantee in production. #335.
- `client/Dockerfile`, `server/Dockerfile` `[security]` · No image `HEALTHCHECK` (compose has one). #335.
- `client/nginx.conf:10` `[security]` · Bootstrap CDN in `style-src` · #273.
- `README.md` `[docs]` · Install steps incomplete, `git commit -am`, French/English mix, Node version missing.

## ⚪ Disagree / Intentional

- Crypto and Joi in `domain/` (pure, keyring injected, ADR-0004); SQL in services without a repository port (ADR-0003); two documented error envelopes; in-memory limiters (single instance, ADR-0001); fast bcrypt in tests (cost only); outbox at-least-once with the dev transport; dev compose Postgres password (non-secret, internal network).

## Per-dimension summary

- Security: sessions, CSRF, authorization, SQL, crypto, headers and containers hold; gaps are CI tooling and hardening. Design: dependency rule holds, no cycles, minimal over-engineering; defects are concurrency races. Tests: behaviour well covered by real-PostgreSQL integration tests, but CI runs none of them and measures coverage on the wrong files. Docs: API table matches the routes except one status code.
