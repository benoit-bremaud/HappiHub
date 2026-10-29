# Local review — HappiHub (#307 integration branch coverage)

Local pre-merge review of the test-only change that raises the server integration branch coverage above 80 %.

- Date: 2026-10-29
- Commit: d8a8f25
- Scope: branch diff `main...test/307-integration-branch-coverage`
- Checks run: design · docs · tests · security · correctness
- Verdict: ship as-is · Must 0 · Should 0 open (8 fixed in d8a8f25) · Nice 2

## Pre-merge gate (head SHA d8a8f25)
| Step | Result |
|---|---|
| 1 Tests | ✅ 161 unit · ✅ 221 integration + 1 todo (#375) |
| 2 Coverage | integration 93.1 % stmts / 82.5 % branches / 96.5 % funcs / 94.3 % lines (floor 80, now enforced in `jest.integration.cjs`) · unit 44.8 % stmts / 46.8 % branches · docs: no counter in the repo (not measured) |
| 3 SonarQube | ✅ PASSED (local server, unit + integration + client lcov) |
| 4 Secrets | ✅ gitleaks clean (`main..HEAD`, `docs/architecture/qa`) · no tracked .env · diff read: synthetic fixtures only |
| 5 QA pass | ✅ smoke (test-only diff) · console clean · CORS/401/cookie checks ok · finding → comment on #347 · report: docs/architecture/qa/2026-10-29-307-qa-smoke.md |
- Gate: **GREEN — merge authorised on owner approval**

## 🔴 Must Have
_None._

## 🟡 Should Have
Fixed in d8a8f25:
- `server/tests/integration/requestPaths.test.js` `[tests|correctness]` · cities response shape tolerated two forms → asserts the array.
- `requestPaths.test.js` `[tests]` · locale-dependent re-sort of commune names → asserts exact name first and prefix match.
- `requestPaths.test.js` `[tests]` · limiter-key test claimed behavior it did not observe → renamed, marked coverage-only.
- `requestPaths.test.js` `[tests|correctness]` · 500 test pins bug #376 → issue in title, comment says the fix updates it.
- `requestPaths.test.js` `[tests]` · DB outage test did not check recovery → re-asserts the session after recovery.
- `requestPaths.test.js` `[tests]` · redundant `createApp()` guard test → removed.
- `requestPaths.test.js` `[correctness]` · unused `pending_email_bidx` selection → removed (#375 todo tracks the bug).
- `server/tests/integration/harness.js` `[design]` · `accountId` duplicated in two suites → shared named export.

## 🔵 Nice to Have
- `requestPaths.test.js` `[design]` · `flaky()` wraps `query` but not `connect`; a short comment would explain the limit.
- `requestPaths.test.js` `[docs]` · a few lines exceed 120 characters.

## ⚪ Disagree / Intentional
- `requestPaths.test.js` `[tests]` · tests pinning the current 500 (#376) and the `test.todo` (#375) are intentional: production fixes need their own conception (AGENTS.md).

## Per-dimension summary
- Design: one duplicated helper, fixed · Docs: comments accurate · Tests: healthy pyramid, boundaries-only doubles, weak assertions fixed · Security: synthetic fixtures, no leak · Correctness: no resource leak; flaky BC5 race tracked in #374.

Follow-ups filed: #372 (config D7 unit tests), #373 (integration suite in CI), #374 (BC5 flaky race), #375 (stale pending email), #376 (body-parser 4xx).
