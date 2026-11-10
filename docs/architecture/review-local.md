# Local review — HappiHub (branch diff main...HEAD, #410)

- Date: 2026-11-10
- Commit: 3384eea
- Scope: branch diff `origin/main...HEAD` (`--push`), 48 files (local CI wiring, workflow and collector removal, ADR-0005, docs)
- Checks run: adversarial (Opus, 3 rounds) · design (architecture-guardian) · docs (doc-auditor) · tests (test-auditor) · security and correctness folded into the adversarial pass (shell, hooks, token handling)
- Verdict: ship as-is · Must 0 · Should 0 · Nice 6

## Adversarial review (#236)
- Round 1 on `4317db7`: Must 5 · Should 7 · Nice 8 · unverified 1 · Push gate: closed
- Round 2 on `500a2b2`: 4 Must fixed, 1 not fixed (bootstrap order) · 6 Should fixed, 1 partly · 0 regressed · new Must 1 (same point) · Push gate: closed
- Round 3 on `f2ae89a`: 1 Must fixed · 3 Should fixed · 2 Nice fixed · 0 regressed · new Must 0 · new Should 1 (four mixed server/client waiver reasons cited #414 only: fixed in the report commit, both issues cited) · **Push gate: open**
- Optional second review (owner's OpenAI account): ChatGPT/Codex not run (never a gate step)

## Pre-merge gate (head SHA 3384eea, `just gate` runs on `c0475a9`, `7b3ae03`, `3384eea`)
| Step | Result |
|---|---|
| 0 CI mirror | n/a: no PR workflow left (`.github/workflows/` deleted, ADR-0005); the former `test` and `integration` jobs are `just test` / `just integration` on the same Node 22.23.3 |
| 1 Tests | ✅ server unit 173 · ✅ client 123 · ✅ client build · ✅ `test-local-ci` 65 · ✅ `test-attest` 30 · ✅ integration 227 + 1 todo (disposable PostgreSQL) |
| 2 Coverage | server unit 47.74 % stmts (unit only; the integration run adds the rest and SonarQube reads all three lcov reports) · client 93.84 % stmts / 84.79 % branches / 94.69 % funcs / 96.89 % lines · docs: no counter in this repository (n/a) |
| 3 SonarQube | ✅ `QUALITY GATE STATUS: PASSED` on `happihub` (first run 403: the scanner defaulted to SonarCloud without `sonar.host.url`, fixed in `7b3ae03`) |
| 4 Secrets | ✅ gitleaks clean (whole history, `--redact`) · no tracked `.env` (only `.env.example`) · diff read: `.github/allowed_signers` holds the author's public key and commit email, nothing else sensitive |
| 5 E2E/smoke | ✅ 6 journeys (smoke + E2E, Playwright) on the local production build · JRN- not covered: no test plan in this repository · QA pass: no staging yet (#386) |
| Images | ✅ `trivy config` clean on both Dockerfiles · ⚠️ `trivy image` report-only: 44 (server, Debian 12) + 12 (client, Alpine 3.24) OS-package findings, none in the application code, same backlog on the newest base digests, tracked by #416 |
- Gate: **attested on `3384eea`** (`attest: gate recorded`, commit status `gate` = success, note on `refs/notes/gate`), **one ⚠️ step** (image scan report-only, #416) → the owner's waiver question (`common.md` § Attestation and merge). `sh scripts/attest.sh verify gate 3384eea` fails on purpose: `.github/allowed_signers` is not on `main` yet, so this first merge is the bootstrap waiver of ADR-0005. The report commit that follows is re-gated.

## 🔴 Must Have
_None open._ Fixed in `e7ac9bb`, `500a2b2`, `f2ae89a`:
- `justfile` `gate` `[adversarial]` · `trivy config .` scanned vendored Dockerfiles in `node_modules` and `.claude/worktrees`, so the gate could never attest · `--skip-dirs '**/node_modules' --skip-dirs .claude`, asserted by the wiring test.
- `justfile` `gate` `[adversarial|tests|design]` · `cd e2e && npm test && cd ..` was not stopped by `set -e` · `(cd e2e && npm test)`, regex anchored, `set -eu` asserted on `gate` and `merge`.
- `.github/branch-protection.md`, ADR-0005 `[adversarial]` · live protection still requires the deleted `test` status and the documented order could not merge the PR · the protection is applied first, `just gate` posts `gate` (`attest.sh write` reads no trust store), then the waiver merge.
- `justfile` `nightly` `[adversarial]` · TruffleHog is red on a partial (`blob:none`) clone · `[private] full-clone` dependency first, conversion command in the message, HANDOVER follow-up.
- `scripts/test-attest.sh` `[design|tests|adversarial]` · the vendored tests predated the vendored script (`write gate <commit>` and the #372 retry untested; `bad signature` branch unreachable) · rebuilt from upstream minus the cassette block, plus empty / unknown / moved-HEAD refusals and a tampered signature (30 cases).
- `docs/architecture/specs/{sonarqube-local-collector,ci-integration-suite,e2e-smoke-tests}.md`, five collector diagrams, `CHANGELOG.md:20`, `tools/ingress/test_ingress.py:6` `[docs|design|adversarial]` · stale copies of the removed procedure · "Superseded by ADR-0005" status lines, reworded references.

## 🟡 Should Have
_None open._ Fixed:
- `justfile` `gate` `[adversarial]` · no `npm ci` before the checks, so an attested SHA could carry an uninstalled lockfile · the three trees are reinstalled (`--ignore-scripts`) after the head capture, Chromium installed for `e2e`.
- `osv-scanner.toml`, #411 `[adversarial]` · runtime react-router advisories and 45 toolchain advisories waived under an issue scoped to the server · #413 (react-router 7) and #414 (react-scripts toolchain) with review-by-expiry; HANDOVER and ADR expiry lines name the three issues.
- `justfile` `gate base` `[docs|design|adversarial]` · unused parameter and fetch · removed.
- `scripts/test-local-ci.sh` `[tests|adversarial]` · 22 change-detector greps, no `set -eu`, node-guard, L0 shellcheck/hadolint or lockfile-drift cases; the node-guard case rewrote the tracked `.nvmrc` · behavioural cases on the throwaway repo, drift checks on `lockfiles`, `--error`, `allowed_signers`; 63 cases.
- `scripts/test-attest.sh` `[tests]` · the fake `gh` and the no-note / wrong-state combinations stay as upstream (the copy is the drift tripwire); the tampered-signature case covers the signature branch.
- `CONTRIBUTING.md` `[docs|design]` · "Copilot is best-effort", no timer install procedure, no branch-protection link, skill references unexplained · fixed; `docs/HANDOVER.md` links the tier table instead of restating the gate and lists the CI follow-ups.
- ADR-0005 `[adversarial]` · Semgrep `p/default` and `uvx` are the one unpinned input · recorded with its remedy; "Trivy on the compose configuration" corrected to the two Dockerfiles (compose files are not scanned).
- `docs/SONARQUBE.md` `[adversarial]` · the plaintext-token exception was dropped with the collector · loopback-only statement recorded (owner approval of that segment is cited from the former CRYPTO-1 exception; see Unverified).

## 🔵 Nice to Have
- `justfile` `nightly` `[adversarial]` · `mise outdated` exits 0 and lists global tools too; informational only.
- `scripts/attest.sh` `[adversarial]` · the push check runs at the end of the gate; a `git branch -r --contains` at the start would fail faster.
- `typos.toml` `[design|adversarial]` · short French tokens allow-listed globally (`ba`, `mis`, `sur`); scope them per file if a real typo ever hides behind one.
- `justfile` `postgres_image` `[adversarial]` · used in one error message only.
- `scripts/test-local-ci.sh` mode 644 vs `test-attest.sh` 755 `[adversarial]`.
- `client/package.json` `[design]` · move the client coverage globs from the `just test` command line into the Jest config (a client-config change, owner approval under AGENTS.md); `.npmrc` `engine-strict=true` for bare `npm ci` (same).

## ⚪ Disagree / Intentional
- `scripts/attest.sh:2` `[docs|adversarial]` · "ADR-0003/0004" are agents-skills ADRs · the file stays byte-identical to `~/.claude/scripts/attest.sh` so fixes resync with `diff`; CONTRIBUTING says skill and agents-skills references point at the owner's tooling.
- `scripts/test-attest.sh` staging and release cases `[tests]` · code HappiHub does not use yet · kept as the drift tripwire of the verbatim copy (header says so).
- `justfile` `gate` fails early when Docker, `sonar-scanner`, the token or the instance is missing `[design]` · stricter than rule 5's "warn and exit 3"; SonarQube is never skippable (rule 2).
- `justfile` `integration` in L2 only `[adversarial]` · 172 s measured, over the 3 min L1 budget.
- `.github/allowed_signers` holds the author email `[adversarial]` · already the author of every commit; the format is the skill's.
- `.github/branch-protection.md` `strict: true`, `enforce_admins: false` `[design]` · solo-project emergency bypass; the forgery-proof check is the signed note.

## Unverified
- `docs/SONARQUBE.md` loopback exception: the owner approved CRYPTO-1 for the Docker-network segment on 2026-10-13; the host-to-`localhost:9000` segment is asserted here, not separately approved. Raised in the PR validation question.
- `trivy image` on the two runtime images: first run happens in `just gate` on the pushed head.

## Per-dimension summary
- Adversarial: 5 Must in round 1 (gate could never attest, E2E not stopping the gate, branch protection, partial clone, stale specs), 1 carried to round 2 (bootstrap order), all fixed on `f2ae89a` · Design: lean, one dead parameter and duplicated tier prose, vendored tests out of step (fixed) · Docs: stale references to the removed collector and workflow (fixed), timer and protection procedures added · Tests: text-greps replaced by behavioural cases, attestation suite resynced and extended (63 + 30 cases) · Security: token via environment only, `--ignore-scripts`, `--redact`, `--no-verification`, no tracked env file · Correctness: `set -e` semantics of the subshell and loop forms verified under dash.
