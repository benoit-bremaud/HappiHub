# Local review — HappiHub (brick D)

- Date: 2026-10-16 (second pass after fixes)
- Commit: see the commit that adds this report (fixes in 7c5527f and the QA fix commit)
- Scope: branch diff origin/main...feat/brick-d-accounts-associations
- Checks run: design · docs · tests · security · correctness · QA pass
- Verdict: Must Have resolved; merge still blocked by SonarQube · Must 0 open (7 fixed + 2 found in QA, fixed) · Should 10 · Nice 12

## Pre-merge gate
| Step | Result |
|---|---|
| 1 Tests | ✅ server 48 unit + 51 integration (disposable PostgreSQL) · ✅ client 36 · ✅ client build |
| 2 Coverage | server 91.8 % stmts / 72.5 % branches / 96.8 % funcs / 93.8 % lines · client `src/accounts` 93.9 % stmts / 69.8 % branches / 96.8 % funcs / 97.1 % lines · docs: every exported function flagged by the doc audit now documented (no counter tool in this repo) |
| 3 SonarQube | ⚠️ not run: scanner bootstrap rejected with HTTP 403 (token) — owner action |
| 4 Secrets | ✅ gitleaks clean on origin/main..HEAD · no tracked .env (the ignored `server/.env.docker.local` is local only) · diff read: only the non-secret local compose credential |
| 5 QA pass | ✅ full pass on the Docker stack: sign-up, sign-in refused before verification, verification link, sign-in, account page, invitation sent, invitation page as anonymous · network clean (lookup 200, verification 200) · screenshots in `docs/architecture/qa/2026-10-16-brick-d-*.jpg` |
- Gate: **RED — SonarQube not run** (everything else green)

## 🔴 Must Have (all fixed)
- Emailed-link pages posted before the CSRF bootstrap → now wait for the session (7c5527f).
- `deliverOutbox` hand-rolled transaction → `withTransaction` (7c5527f).
- Client modules below 80 % → page tests, `src/accounts` 97 % lines.
- AC15/AC18 log test with fake tokens → real tokens, stdout/stderr captured.
- AC2 headers → compared. AC18 fragment → explicit test.
- Docs coverage → missing docstrings added, maintenance scheduling documented.
- S1 pre-registration takeover (security Should, escalated by owner decision S1-C, 415/500) → verification opens no session, sign-in requires a verified email, reset verifies.
- QA finding: StrictMode double render consumed the fragment token, so every verification link failed in development → pure read in `useFragmentToken` + regression test.
- QA finding: unused Bootstrap JS without jQuery threw on every page → removed from `index.html`.

## 🟡 Should Have
- `server/services/accounts.js:149-156` `[security]` · S2 resend matches `pending_email` of another account; `LIMIT 1` without order can replace the real owner's token · prefer the row whose own email matches, skip pending addresses already taken.
- `server/services/invitations.js:112-134` `[correctness]` · accept vs close lock-order deadlock · lock the association first and re-check ACTIVE.
- `server/services/accounts.js` deleteAccount `[correctness]` · last SUPER_ADMIN check racy · advisory lock before the count.
- `server/utils/keyedLimiter.js` `[correctness|security]` · unbounded map keyed by attacker-chosen emails · prune expired entries.
- `server/jobs/runMaintenance.js:5`, `server/server.js:25` `[design]` · context built twice; CLI imports the HTTP app · `createContext` module.
- `server/jobs/maintenance.js:26-29` `[design|correctness]` · duplicates `issueToken` · export and reuse.
- `server/controllers/accountController.js` `[design]` · five validation variants, token schema ×4 · extend `validate(schema, body, extra)`, shared `tokenSchema`.
- `client/src/accounts/AuthPages.jsx:9-22` `[design]` · shared `useSubmit`/`Message` live in one page · move to `form.jsx`.
- `server/app.js:47-56` `[design]` · inline session refresh middleware · `middleware/session.js`.
- `accounts.test.js` `[tests]` · still open: AC14 idle expiry untested; AC17 partial (resend, accept, lookup, Retry-After everywhere); weak `toBeDefined` assertions; monolithic UC11 and AC8 tests.

## 🔵 Nice to Have
- `server/services/invitations.js` `[security]` · raw invitation link returned to the inviter (DF3) · drop `link` unless required.
- `server/services/accounts.js:138` `[security]` · email change does not bump `auth_version`.
- `server/services/outbox.js` `[security]` · log transport enabled whenever not production · explicit `EMAIL_TRANSPORT=log` opt-in.
- `server/routes/api.js` `[security]` · no rate limit on lookup / verification / reset confirm (bcrypt before token check) · limiter or token-first.
- Sign-up timing difference `[security]` · bcrypt dominates; accepted.
- `server/services/accounts.js:85-88` `[correctness]` · dead pending_email clear before throw.
- `server/jobs/maintenance.js` `[correctness]` · one failing account aborts the run · per-account try/catch.
- `client/src/accounts/AccountPage.jsx:30-35` `[correctness]` · email state not reset after save.
- `server/services/associations.js` updateProfile/closeAssociation `[correctness]` · actor membership not re-checked under lock.
- `AccountPage`/`AssociationPage` `[correctness]` · "Loading…" forever when session unavailable; stale state on slug change.
- Hard-coded 5/10 in messages, `PASSWORD_HINT` duplicated client/server, export limiter flow `[design|docs]`.
- `outbox.js` deliver holds a transaction while sending `[correctness]` · revisit with T11a.

## ⚪ Disagree / Intentional
- SQL in services without a repository layer — spec § 2 option A.
- `CASE WHEN` profile update — constant query text rule (spec § 2), checked by `queryText.test.js`.
- Transport interface with one implementation — spec § 6, T11a provider planned.
- Integration-heavy server pyramid — SQL/transaction brick, ADR-0001.
- Member emails visible to co-members — amendment A-D5 validated.

## Per-dimension summary
- Design: proportionate; one Must (outbox transaction), duplication cleanups.
- Docs: no stale docs; ~70 % presence, maintenance scheduler undocumented.
- Tests: server strong; AC2/AC15/AC18 false confidence; client pages untested.
- Security: no Must; S1 pre-registration takeover and S2 resend mismatch need fixing.
- Correctness: emailed-link pages broken by CSRF bootstrap order; lock-order and race issues.
