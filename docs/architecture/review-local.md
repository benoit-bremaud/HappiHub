# Local review — HappiHub (branch diff main...HEAD, #378)

- Date: 2026-11-05
- Commit: 90540d2
- Scope: branch diff `origin/main...HEAD` (`--push`)
- Checks run: adversarial (Opus, 2 rounds) · design + docs (architecture-guardian) · tests (test-auditor) · security and correctness (diff read, adversarial)
- Verdict: ship · Must 3 (fixed) · Should 7 (fixed) · Nice 7 (fixed)

## Adversarial review (#236)
- Round 1 on `a2cc573`: Must 1 · Should 3 · Nice 2 · unverified 1 · Push gate: closed
- Round 2 on `80903b1`: 6 fixed · 0 not fixed · 0 regressed · new Must 0 · **Push gate: open** (its 2 Should and 2 Nice fixed in `90540d2`)
- Hosted reviewers: Copilot not enabled; Codex reviews ignored (owner rule).

## Pre-merge gate (head SHA 90540d2)
| Step | Result |
|---|---|
| 0 CI mirror | server unit + integration run locally as in CI |
| 1 Tests | ✅ server unit 168 · ✅ server integration 226 (+1 todo) · client untouched |
| 2 Coverage | ⏸ deferred to the pre-merge run (`--push`) |
| 3 SonarQube | ⏸ deferred to the pre-merge run (`--push`) |
| 4 Secrets | ✅ gitleaks clean (`origin/main..HEAD`) · no tracked .env · diff read: nothing sensitive |
| 5 E2E/smoke | ⏸ deferred to the pre-merge run (`--push`) |
- Gate: **pre-push green**; coverage, SonarQube and E2E deferred (not GREEN).

## 🔴 Must Have
- `server/services/accounts.js` `ORDER BY id` vs `server/jobs/maintenance.js` purge and `requestPasswordReset` `[adversarial|design]` · token-against-token deadlock (random UUID order vs physical order) · fixed in `80903b1`: purge `SKIP LOCKED`, reset locks first (conception revalidated, D1 A).
- `docs/architecture/specs/account-token-lock-order.md` R6 `[design]` · false "cannot form a cycle" claim · fixed in `80903b1` (R6, R7).
- `server/tests/integration/lockOrder.test.js` AC378-1 + `PROJECT_LOG.md` `[design|tests|adversarial]` · RESET token did not reproduce the L6 cycle; log over-claimed · fixed in `80903b1` (VERIFY token, red verified on origin/main).

## 🟡 Should Have
- `server/services/accounts.js` `deleteAccountRow` `[design]` · lock contract only in a comment · fixed (lock moved inside, D2 A).
- `docs/changelog/CHANGELOG.md` `[design]` · over-broad race list · fixed.
- `lockOrder.test.js` `[tests|adversarial]` · connection left in an open transaction on failure · fixed (`holding()` rollback).
- AC378-3 L4 `ORDER BY id` not asserted `[tests]` · fixed (`lockAccountTokens` SQL unit test, all sites use it).
- Spec R7 trigger `[adversarial r2]` · wrong trigger · fixed in `90540d2`, owner re-confirmed acceptance.
- Spec AC378-3 SKIP LOCKED unit claim `[adversarial r2]` · fixed (covered by AC378-5).
- `deleteAccount` doc `[adversarial]` · no longer applies after D2 A.

## 🔵 Nice to Have
- Unit `.catch(() => {})`, `test.each`, code comments for R3/R2, HANDOVER #368 link, deterministic second waiter, exact `tokensPurged` · all fixed. `.then((r) => r)` kept: it sends the supertest request immediately.

## ⚪ Disagree / Intentional
- `deleteAccountRow` double lock inside the purge · no-op in the same transaction (R4, D2 A).
- CHANGELOG lists #378 under merged before merge · precedent `d16b283`.

## Per-dimension summary
- Adversarial: one real regression found and reproduced, fixed and verified · Design: helper proportionate, no over-engineering · Docs: claims now match code · Tests: deterministic red/green races · Security: parameterized SQL, nothing sensitive · Correctness: unit 168, integration 226.
