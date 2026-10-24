# Local review — HappiHub (branch claude/fix-328-purge-race-7a0d63)

- Date: 2026-10-24
- Commit: 14488ca + review fixes cc46bf2
- Scope: branch diff main...HEAD (`server/jobs/maintenance.js`, `server/services/accounts.js`, maintenance integration tests, #328 spec + sequence diagram, AC19 link)
- Checks run: correctness + security (Opus), design · docs · tests (one combined pass), execution checks
- Verdict: ship after owner decision on S9382 · Must 1 · Should 6 · Nice 6 — all fixed or dispositioned below

## Pre-merge gate (head SHA cc46bf2)
| Step | Result |
|---|---|
| 1 Tests | ✅ server unit 142/142 · ✅ server integration 114/114 (3 runs, stable) · ✅ client 84/84 |
| 2 Coverage | integration: 91.05 % stmts / 73.42 % branches / 96.53 % funcs / 93.79 % lines; `maintenance.js` 100 % lines, 90 % branches · docs: every new function carries a doc comment (no doc-coverage counter in this repo) |
| 3 SonarQube | ❌ FAILED on `new_violations` = 2 (S9382 "await inside a loop", `maintenance.js:43`, `:61`); new coverage 94.5 % ✅, duplication 0 % ✅. Same intentional per-row transaction loop accepted on 14d1001 (#252); acceptance is the owner's call |
| 4 Secrets | ✅ gitleaks clean (main..HEAD) · no tracked .env · diff read: nothing sensitive |
| 5 QA pass | ⚠️ not run: hourly server job with no UI or HTTP route; behavior proven by the PostgreSQL race tests (AC328-1..3) |
- Gate: **RED — SonarQube S9382 pending owner decision; QA step not applicable (owner to confirm)**

## 🔴 Must Have
- `server/tests/integration/maintenance.test.js:23` `[tests]` · a bulk text replace had swapped the AC19 `auth_token` purge assertion · restored (cc46bf2).

## 🟡 Should Have
- `server/services/accounts.js:90` `[correctness|tests]` · R5 "missing row → 410" guard unreachable (token cascade answers 410 first), uncovered · removed with R5 (cc46bf2).
- `server/tests/integration/maintenance.test.js:63` `[tests]` · helper claimed to mimic verifyEmail but locks only the account · comment now explains why (locking the expired token blocks the token purge before the scan and hides the race).
- `maintenance.test.js` AC328-3 `[tests|docs]` · covers the verification side only · test and AC328-3 reworded.
- `docs/architecture/specs/maintenance-unverified-race.md` R1 `[docs]` · "recheck in code" inaccurate · reworded.
- `docs/architecture/specs/v1-brick-d-accounts-associations.md:224` `[docs]` · AC19 not linked to the amendment · linked.
- SonarQube S9382 `[design]` · sequential per-row transactions are intentional (one lock set at a time, bounded pool use) · owner decision.

## 🔵 Nice to Have
- `maintenance.test.js:58` `[tests]` · lock-wait probe matched any session · now excludes the probing backend.
- `server/jobs/maintenance.js:61` `[design]` · `&& ? :` precedence hard to read · split into two statements.
- Sequence diagram `[docs]` · 410 note now names the token cascade.
- `server/services/accounts.js:113-119` `[correctness]` · a resend racing the purge can hit an FK error (500) · out of scope, follow-up issue proposed.
- `server/jobs/maintenance.js` `[design]` · a 409 from `deleteAccountRow` stops the run · tracked by #330.
- `lockUnverified` selects columns unused by the delete path · harmless, kept for one helper.

## ⚪ Disagree / Intentional
_None._

## Per-dimension summary
- Design: one helper, lock order shared with verifyEmail, no schema change · Docs: spec, diagram and AC19 aligned · Tests: race reproduced (red on old code, green on fix) · Security: parameterised SQL, neutral 410, no deadlock path found · Correctness: counts now report committed effects.
