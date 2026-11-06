# Local review — HappiHub (branch diff main...HEAD, #395)

- Date: 2026-11-06
- Commit: 440f76e (round 2) + round 2 fixes
- Scope: branch diff `origin/main...HEAD` (`--push`)
- Checks run: adversarial (Opus, 2 rounds) · design + docs + security (test-auditor brief) · tests (test-auditor) · correctness (adversarial, suite runs)
- Verdict: ship · Must 2 (fixed) · Should 9 (fixed or filed) · Nice 8 (7 fixed, 1 kept)

## Adversarial review (#236)
- Round 1 on `e6cd13d`: Must 2 · Should 6 · Nice 6 · unverified 0 · Push gate: closed
- Round 2 on `440f76e`: 14 fixed · 1 not fixed (Nice, intentional) · 0 regressed · new Must 0 · **Push gate: open**
- Hosted reviewers (filled at the pre-merge run): Copilot pending · Codex not used

## Pre-merge gate (head SHA pending push)
| Step | Result |
|---|---|
| 0 CI mirror | quality-tests.yml: tools unittest ✅ · server jest + coverage ✅ 168 · client jest + coverage ✅ 122 · client build ✅ (inside the e2e run); local Node 22.21.1 vs CI 22.23.3 (patch difference, not code under change) |
| 1 Tests | ✅ server 168 unit · ✅ client 122 · integration ⏸ pre-merge run (no server change) |
| 2 Coverage | ⏸ deferred to the pre-merge run (`--push`) |
| 3 SonarQube | ⏸ deferred to the pre-merge run (`--push`) |
| 4 Secrets | ✅ gitleaks clean (`origin/main..HEAD`) · no tracked .env · diff read: nothing sensitive (passwords generated per run, traces off) |
| 5 E2E/smoke | ✅ 6/6 (S1–S2, J-E2E-1 to J-E2E-4) on the local prod build, `npm test` in e2e/; formally recorded at the pre-merge run |
- Gate: `--push`: **pre-push green** — steps 2 and 3 deferred (never GREEN)

## 🔴 Must Have
- `docs/architecture/specs/e2e-smoke-tests.md:62` `[adversarial|docs]` · spec and diagram described a `globalTeardown.js`, `client/build` and an outdated § 6 · fixed in 440f76e
- `PROJECT_LOG.md`, `docs/HANDOVER.md`, `docs/WORK_PLAN.md`, `docs/changelog/CHANGELOG.md` `[adversarial|docs]` · not updated · fixed in 440f76e

## 🟡 Should Have
- `e2e/globalSetup.js` `[adversarial|tests]` · setup failures hid their cause (API log deleted, migration error swallowed) · fixed
- `e2e/support/paths.js:2` `[adversarial]` · `URL.pathname` broke paths with spaces · fixed (`fileURLToPath`); POSIX only documented
- `e2e/playwright.config.js:15` `[adversarial|security|tests]` · traces recorded typed passwords · fixed (`trace: 'off'`)
- `e2e/tests/smoke.spec.js:6` `[adversarial|tests]` · S1 did not check the anonymous body · fixed
- `docs/architecture/diagrams/e2e-smoke-tests/01-deployment.md:11` `[adversarial]` · API binds every interface · diagram fixed, follow-up #401
- `AGENTS.md:57` `[adversarial|docs]` · missing e2e verified command · fixed
- `e2e/globalSetup.js:84` `[adversarial]` · `DATABASE_URL_DEV_FILE` from a developer env could redirect migrations · fixed (set empty)
- spec § 8 / N7 `[adversarial]` · promised follow-ups not filed · filed #400, #401 (and #402)
- `docs/changelog/CHANGELOG.md:9` `[adversarial]` · intro list lacked #395 · fixed

## 🔵 Nice to Have
- `e2e/serveBuild.js:15` `[tests|security]` · malformed URL crashed the server; missing assets served index.html · fixed (400 / 404)
- `e2e/globalSetup.js:40` `[adversarial]` · in-place `reverse()` on double teardown · fixed (`splice`)
- `e2e/tests/smoke.spec.js:16` · loose agenda predicate · fixed
- `e2e/tests/journeys/events.spec.js:38` · `.first()` city pick · fixed (exact Lyon)
- `docs/architecture/specs/test-environment.md:223` · stale "E2E deferred" · fixed
- `CONTRIBUTING.md:38`, `e2e/globalSetup.js:39,58` · POSIX note, `error.message` fallback, SIGTERM 143 · fixed
- `sonar-project.properties` `[tests]` · tooling files counted as tests · kept: they are test tooling, not sources

## ⚪ Disagree / Intentional
- `e2e/tests/journeys/agenda.spec.js:8` · E15 absence check is weak (no start date) · kept, E19 check is meaningful
- `e2e/playwright.config.js`, `e2e/globalSetup.js` · default exports · Playwright requires them; named exports also provided (spec N5)
- API in DEV tier · decision D5 A validated by the owner

## Per-dimension summary
- Adversarial: 2 Must on stale docs, fixed; round 2 open · Design: proportional, one ~110-line setup · Docs: spec, diagrams, AGENTS, CONTRIBUTING, log aligned · Tests: 6 focused checks, role-based selectors · Security: traversal guarded, secrets per run, traces off · Correctness: 6/6 green, clean teardown incl. Ctrl-C
