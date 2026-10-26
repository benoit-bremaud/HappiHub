# Local review — HappiHub (branch feat/demo-seed-251)

- Date: 2026-10-26
- Commit: fe9ab2e + review fixes c2a1d74
- Scope: branch diff main...HEAD (`server/seed/`, `server/jobs/seedDemo.js`, `server/jobs/runSeedDemo.js`,
  `server/services/outbox.js`, demo seed unit + integration tests, rejection catalogue, test-environment spec D8 + § 12,
  log/handover/changelog, QA report, `sonar-project.properties`)
- Checks run: design · docs · tests · security · correctness, execution checks
- Verdict: ship · Must 0 open (3 fixed) · Should 0 open (7 fixed, 3 deferred to issues) · Nice 5 → issues

## Pre-merge gate (head SHA c2a1d74)
| Step | Result |
|---|---|
| 1 Tests | ✅ server unit 161 · ✅ server integration 156 (incl. 29 rejection-catalogue cases) · ✅ client 84 |
| 2 Coverage | server unit+integration (integration run) 90.7 % stmts / 75.5 % branches / 96.1 % funcs / 93.3 % lines · client 92.6 / 82.0 / 93.6 / 96.1 · SonarQube new code 95.0 % (floor 80) · docs: every new module and exported function carries a docstring |
| 3 SonarQube | ✅ PASSED — 15 × S9382 (`await` in a loop, `server/jobs/seedDemo.js`) accepted as intentional by the owner (2026-10-26, MCDA A 475/500): the seed is sequential by design, each step reads the state the previous one wrote (D7) |
| 4 Secrets | ✅ gitleaks clean (main..HEAD) · no tracked .env · diff read: placeholder-only example credentials, demo addresses under `demo.example.com` |
| 5 QA pass | ✅ pass · AC5 in the browser (Claire signs in, Sofia refused on A1, visitor 200/404/404) · report: docs/architecture/qa/2026-10-26-demo-seed.md |
- Gate: **GREEN — merge authorised on owner approval** (GitHub Actions has no credit: CI waiver to be asked)

## 🔴 Must Have
- `server/seed/demoGuard.js:22` `[security]` · `?host=` / `?hostaddr=` query parameters replaced the URL host and bypassed the local-host check · **fixed c2a1d74**: both parameters refused, unit cases added
- `server/jobs/seedDemo.js` `[design|correctness]` · D7 convergence: a rerun after an interrupted run left accounts, memberships and events half-built · **fixed c2a1d74**: `convergeAccount`, pending invitation resent then accepted, event steps applied from the current state; integration test "a rerun completes a half-built account, membership and event"
- `server/tests/integration/seedDemo.test.js` `[tests]` · AC3 "no write" was not asserted · **fixed c2a1d74**: runner refusal without `--confirm` and with `NODE_ENV=production`, table counts unchanged

## 🟡 Should Have
- `server/seed/demoGuard.js:5` `[security]` · any single-label host was accepted · **fixed**: allowlist `postgres`, `db`
- `server/jobs/seedDemo.js` `[security]` · `--reset` deleted associations by name only · **fixed**: scoped to demo-account owners
- `server/jobs/seedDemo.js` `[correctness]` · credentials written once after the loop · **fixed**: written after each account
- `server/jobs/seedDemo.js` `[correctness]` · `assertMigrated` swallowed every error · **fixed**: only `42P01`
- `server/jobs/seedDemo.js` `[design]` · duplicated attempts constant and hard-coded personas · **fixed**: `MAX_ATTEMPTS` exported from outbox, recipients derived from the dataset
- `server/tests/integration/seedDemo.test.js` `[tests]` · `>30` / `>8` bounds, hard-coded migration count · **fixed**: exact tallies, count derived from the directory
- `sonar-project.properties` `[tests]` · integration coverage was not reported to SonarQube (new-code coverage 60 %) · **fixed**
- Deferred to issues: dataset `.map` patch cleanup (#363), R-EVT-6 publish status assertion and AC7 `git check-ignore` test (#364)

## 🔵 Nice to Have
- Credentials file: write to a temp file with `O_EXCL` then rename, refuse symlinks → #362
- Guard: compare keyrings by `realpath` → #362
- `server/jobs/runSeedDemo.js` dotenv comment wording; shared `createJobContext` (Rule of Three with maintenance/reencrypt) → #363
- Split `rejectionCatalogue.test.js` by domain → #364
- E12 archived on the next tick and A3 quota after repeated purges are documented in spec § 12 (G2, G3)

## ⚪ Disagree / Intentional
- `server/tests/integration/rejectionCatalogue.test.js` R-PUB-1 `[tests]` · a closed association answers 404, as the spec states; not a defect
- `server/jobs/seedDemo.js` S9382 `[correctness]` · sequential awaits are required by D7 (owner waiver above)

## Per-dimension summary
- Design: services-only writes kept, convergence added without new layers · Docs: spec § 12 amendments current · Tests: AC1–AC8 covered, convergence and no-write now asserted · Security: host override closed, reset scoped · Correctness: rerun idempotent and convergent
