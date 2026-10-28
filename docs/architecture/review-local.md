# Local review — HappiHub (#295 repo audit leftovers)

- Date: 2026-10-28
- Commit: 225f2d8 plus review fixes (see branch head)
- Scope: branch diff origin/main...HEAD (`chore/295-remove-repo-audit-leftovers`)
- Checks run: design · docs · tests · security · correctness (two combined reviewers; no container file touched)
- Verdict: ship after fixes · Must 0 · Should 4 (all fixed) · Nice 3

## Pre-merge gate (pre-push run)
| Step | Result |
|---|---|
| 1 Tests | ✅ server unit 161 · ✅ server integration 9 suites · ✅ client 93 · ✅ client build |
| 2 Coverage | server unit 44.8 % stmts / 46.8 % branches; integration 90.9 % stmts / 75.7 % branches (floor 80: below, tracked by #307, no regression from this diff) · docs: no new code to document |
| 3 SonarQube | ⚠️ pending: the local collector analyzes the CI artifact after push |
| 4 Secrets | ✅ gitleaks clean (origin/main..HEAD) · no tracked .env · diff read: nothing sensitive |
| 5 QA pass | pending before merge: smoke (tooling-only diff, no product behavior change) |
- Gate: **push authorised; merge waits for steps 3 and 5**

## 🔴 Must Have
_None._

## 🟡 Should Have
- `.github/workflows/quality-tests.yml:33` `[correctness]` · CLI globs overrode `jest.config.cjs` and counted operator entry points · fixed: CI uses the config scope.
- `sonar-project.properties:6` `[correctness]` · exclusion still named `babel.config.js` · fixed: `babel.config.*`.
- `docs/architecture/specs/test-environment.md:39` `[docs]` · stale `globalSetup.js` path · fixed.
- `docs/HANDOVER.md:71` `[docs]` · glob-gap note became false · fixed.

## 🔵 Nice to Have
- `docs/architecture/specs/repo-audit-leftovers.md` R3 `[docs]` · source files cited inaccurately · fixed.
- `server/.env.example` `[docs]` · `DATABASE_URL_TEST` next to `TEST_DATABASE_URL` may confuse · comments explain each; left as is.
- `server/seed/` `[tests]` · now in coverage scope via jest config · accepted, measured by #307.

## ⚪ Disagree / Intentional
- `.gitleaksignore:3` `[security]` · still names deleted `client/test.rest` · required for the historical commit.

## Per-dimension summary
- Design: pure removal, no over-engineering · Docs: three stale references fixed · Tests: existing suites cover the change · Security: removes bundled-secret placeholders, no findings · Correctness: no CommonJS leftover after `"type": "module"`.
