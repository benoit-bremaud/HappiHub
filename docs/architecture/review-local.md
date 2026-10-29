# Local review — HappiHub (#341)

- Date: 2026-10-29
- Commit: 0368d24
- Scope: branch diff `origin/main...fix/341-resend-verification-purge-lock`
- Checks run: design · docs · tests · security · correctness
- Verdict: ship as-is · Must 0 · Should 3 (2 fixed in 0368d24, 1 filed #378) · Nice 3

## Pre-merge gate (head SHA 0368d24)

| Step | Result |
|---|---|
| 1 Tests | ✅ 164 unit · ✅ 222 integration (1 todo) · AC341-1 red on the old code (500), green on the fix |
| 2 Coverage | integration 93.15 % stmts / 82.57 % branches / 96.54 % funcs / 94.36 % lines (floor 80) · docs: no counter in this project |
| 3 SonarQube | ✅ PASSED (local scan, three lcov reports regenerated) |
| 4 Secrets | ✅ gitleaks clean (`origin/main..HEAD`) · no tracked .env · diff read: nothing sensitive |
| 5 QA smoke | ✅ running API (port 5010, disposable PostgreSQL 55432, demo seed): signup 202, resend known unverified 202 + one VERIFY queued, resend unknown 202 + nothing queued, invalid email 400, no server error |

- Gate: **GREEN — merge authorised after owner approval**

## 🔴 Must Have

_None._

## 🟡 Should Have

- `server/tests/unit/resendVerification.test.js` `[tests]` · no test for the recheck that still matches · fixed in 0368d24.
- `server/services/accounts.js:109` `[security]` · with no token rows only the account lock serializes · comment added in 0368d24.
- `server/services/accounts.js` `updateAccount`, `deleteAccountRow` `[security|correctness]` · account→token lock order opposite to #328 R2, possible 40P01 deadlock (pre-existing) · filed #378.

## 🔵 Nice to Have

- `server/services/accounts.js:117-124` `[design]` · match predicate repeated twice · left as is (two occurrences, SQL text constant).
- `server/jobs/maintenance.js:17`, `server/services/accounts.js:120` `[security]` · multi-row token locks without `ORDER BY id` · tracked in #378.
- `server/services/accounts.js` `resendVerification`, `requestPasswordReset` `[security]` · timing reveals account existence (pre-existing) · filed #379.

## ⚪ Disagree / Intentional

- Extracting a shared helper with `lockUnverified` · the account predicates differ; a helper would be over-engineering.

## Per-dimension summary

- Design: mirrors the #328 lock pattern, no extraction needed · Docs: spec, log and handover consistent, MCDA totals verified · Tests: unit + deterministic integration race, red check done · Security: parameterized, neutral answer kept, two pre-existing issues filed · Correctness: READ COMMITTED `FOR UPDATE` recheck handles deletion and email change while waiting.
