# Local review — HappiHub (branch fix/329-current-password-reservation)

- Date: 2026-10-24
- Commit: c42f74d + review fixes 8fff81b
- Scope: branch diff origin/main...HEAD (`server/controllers/accountController.js`, `server/utils/keyedLimiter.js`, unit + integration tests, #329 spec + sequence diagram, AC17 link, log/handover/changelog)
- Checks run: correctness · security · design · docs · tests (one combined Opus pass), execution checks
- Verdict: ship · Must 0 · Should 1 · Nice 4 — Should and one Nice fixed, rest dispositioned below

## Pre-merge gate (head SHA 8fff81b)
| Step | Result |
|---|---|
| 1 Tests | ✅ server unit 143/143 · ✅ server integration 116/116 (PostgreSQL) · ✅ client 84/84 |
| 2 Coverage | server integration 91.07 % stmts / 73.13 % branches / 96.53 % funcs / 93.8 % lines · client 92.61 / 81.99 / 93.61 / 96.09 · lcov merged under `server/coverage/` (unit + integration + client copy) · docs: every touched function carries a JSDoc |
| 3 SonarQube | ✅ PASSED (local, project `happihub`) |
| 4 Secrets | ✅ gitleaks clean (origin/main..HEAD) · no tracked .env · diff read: nothing sensitive |
| 5 QA pass | ⚠️ API-level only: the HTTP routes are exercised end to end over a real PostgreSQL by AC329-1/3; no UI change; no live browser pass run |
- Gate: **GREEN except step 5 pending owner waiver or live pass**

## 🔴 Must Have
_None._

## 🟡 Should Have
- `server/utils/keyedLimiter.js:28` `[correctness|docs]` · A release after a window reset decrements the new window, contradicting R4 "no-op after reset" · Fixed (8fff81b): R4 reworded; it only follows a correct password, so it grants nothing (KISS over tracking `resetAt`).

## 🔵 Nice to Have
- `server/controllers/accountController.js:137` `[design]` · 429 path relies on `guardLimit` always throwing · Fixed: comment added.
- `server/utils/keyedLimiter.js:29` `[correctness]` · release after reset creates a fresh window · Harmless, kept.
- `server/tests/integration/accounts.test.js:253` `[tests]` · no concurrent `DELETE` case · Same code path as PATCH; kept.
- `server/tests/integration/accounts.test.js:262` `[tests]` · counter 4 checked indirectly · Behavioral assertion is intentional.

## ⚪ Disagree / Intentional
- No per-IP limiter on `PATCH`/`DELETE /account` · owner decision R5 (MCDA A 465/500).

## Per-dimension summary
- Design: 3-line `release`, mirrors `exports.take`, unused `hit` removed · Docs: spec/JSDoc accurate after R4 fix · Tests: deterministic concurrency test red on old code · Security: bypass closed, fail-closed on compare error · Correctness: no reachable release without take.
