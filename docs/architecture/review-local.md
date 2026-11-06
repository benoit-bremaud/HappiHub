# Local review — HappiHub (branch diff main...HEAD, #397)

- Date: 2026-11-06
- Commit: b9d13dd
- Scope: branch diff `origin/main...HEAD` (`--push`)
- Checks run: adversarial (Opus, 2 rounds) · design (architecture-guardian, with security and correctness pass) · docs (doc-auditor) · tests (test-auditor)
- Verdict: ship as-is · Must 0 · Should 0 · Nice 5

## Adversarial review (#236)
- Round 1 on `daa4959`: Must 5 · Should 7 · Nice 3 · unverified 0 · Push gate: closed
- Round 2 on `b9d13dd`: 5 Must fixed · 6 Should fixed, 1 partly (README, carried as Nice) · 0 regressed · new Must 0 · **Push gate: open**
- Hosted reviewers (filled at the pre-merge run): Copilot does not review this repository · Codex ignored (owner rule)

## Pre-merge gate (head SHA b9d13dd)
| Step | Result |
|---|---|
| 0 CI mirror | `quality-tests.yml` on Node 22.23.3: collector unittest OK · server jest coverage 173/173 · client: only `pages.test.jsx` re-run (26/26), full client run and build deferred · integration 227 passed, 1 todo (on `daa4959`, server code unchanged since) |
| 1 Tests | ✅ server unit 173 · ✅ integration 227 + 1 todo · client partial (26) |
| 2 Coverage | integration 93.17 % stmts / 82.57 % branches / 96.55 % funcs / 94.38 % lines (floor 80) · docs ⏸ deferred to the pre-merge run |
| 3 SonarQube | ⏸ deferred to the pre-merge run (`--push`) |
| 4 Secrets | ✅ gitleaks clean (`origin/main..HEAD`) · no tracked .env · diff read: nothing sensitive |
| 5 E2E/smoke | ⏸ deferred to the pre-merge run (`--push`) |
- Gate: `--push`: **pre-push green** — no `justfile`; steps 1, 2 (tests) and 4 by hand, SonarQube, E2E, full client and doc coverage deferred (never GREEN)

## 🔴 Must Have
_None._ (Round 1: 429 `oneOf`, event 400/404 envelopes, invitation `link`, `similarAssociation`, #333 client mock — all fixed in `b9d13dd`.)

## 🟡 Should Have
_None._ (Round 1 Shoulds fixed: drift walker refuses nested routers and other mounts, meta-tests compare with the contract, Express 4 guard, 413/500/503, `PATCH /account` 409 removed, request nullability, session + CSRF on anonymous writes, D2 sensitivity, guide `/communes` row.)

## 🔵 Nice to Have
- `README.md:9,97` `[adversarial]` · still calls the guide the "API contract" · label it "API guide" and link `docs/api/openapi.yaml`.
- `docs/api/openapi.yaml` `/api/comments` `[adversarial]` · writes can also answer 403, 413, 415 before the router · add them.
- `docs/api/openapi.yaml` `components.responses.CodedError` `[adversarial]` · name says coded, schema is `AnyError` · rename (cosmetic).
- `docs/architecture/specs/openapi-contract.md:10-16` `[adversarial]` · scope omits the client mock change · add one line.
- `server/tests/unit/openapiContract.test.js:46` `[adversarial|design]` · `/api/v2` mount throws "outside /api" · clearer message.

## ⚪ Disagree / Intentional
- `docs/changelog/CHANGELOG.md:10` `[adversarial]` · #397 listed in the merged intro before its merge · precedent `369cb01` (#374).
- `server/package.json` `[design]` · `@apidevtools/swagger-parser` pinned 12.1.0 · 13.x pulls an ESM-only dependency babel-jest does not transform (PROJECT_LOG).
- `docs/API_DOCUMENTATION.md` `[design]` · status codes in both guide and contract · accepted by spec; response-body conformance is a follow-up issue.

## Per-dimension summary
- Adversarial: 5 Must in round 1, all fixed, gate open · Design: no over-engineering, test blind spots fixed · Docs: `similarAssociation` and guide gaps fixed · Tests: meta-test now exercises the comparison · Security: no secrets; public projections expose no account ids · Correctness: contract bodies checked by ajv probes (30/30)
