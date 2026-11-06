# Local review — HappiHub (branch diff main...HEAD, #374)

- Date: 2026-11-06
- Commit: 7f477f8 (+ unused-variable cleanup in the report commit)
- Scope: branch diff `origin/main...HEAD` (`--push`)
- Checks run: adversarial (Opus, 2 rounds) · design · docs · tests · security · correctness (the last five covered inline by the adversarial agent and the author, given a 7-file diff)
- Verdict: ship as-is · Must 0 · Should 0 · Nice 1

## Adversarial review (#236)
- Round 1 on `54c1e67`: Must 1 · Should 3 · Nice 1 · unverified 0 · Push gate: closed
- Round 2 on `7f477f8`: 4 fixed · 0 not fixed · 0 regressed · new Must 0 · **Push gate: open**
- Hosted reviewers (filled at the pre-merge run): Copilot pending · Codex ignored (owner rule)

## Pre-merge gate (head SHA 7f477f8)
| Step | Result |
|---|---|
| 0 CI mirror | `test` job: server jest with coverage, client tests and build → deferred to pre-merge for client; `integration` job: `npm run test:integration` ✅ |
| 1 Tests | ✅ server unit 168/168 · ✅ integration 227 passed, 1 todo · AC374-1 fails against the `origin/main` `events.js` (`lastEditedBy: null`) and passes on head |
| 2 Coverage | integration branch floor 80 % enforced and passing · client/doc coverage ⏸ deferred to the pre-merge run |
| 3 SonarQube | ⏸ deferred to the pre-merge run (`--push`) |
| 4 Secrets | ✅ gitleaks clean (`origin/main..HEAD`) · no tracked .env · diff read: nothing sensitive |
| 5 E2E/smoke | ⏸ deferred to the pre-merge run (`--push`) |
- Gate: `--push`: **pre-push green** — steps 2 (client), 3 and 5 deferred

## 🔴 Must Have
_None._ (Round 1 Must — the AC374-1 request was never sent — fixed in `7f477f8`.)

## 🟡 Should Have
_None._ (Round 1: stale `findEvent` JSDoc, transaction leak on test failure, spec status/UML line — fixed in `7f477f8`.)

## 🔵 Nice to Have
- `server/tests/integration/events.test.js:17` `[adversarial|tests]` · `waitForLockWait` duplicated in three integration files · move to `harness.js` in a later test-tidy change.

## ⚪ Disagree / Intentional
_None._

## Per-dimension summary
- Adversarial: fix reproduced in PostgreSQL 17.6, gate open after round 2 · Design: one extra primary-key read, no new lock · Docs: spec, log, handover, plan, changelog consistent · Tests: deterministic regression test with rollback on failure · Security: parameterised queries, no new exposure · Correctness: 404 semantics kept for unknown, foreign and concurrently deleted ids.
