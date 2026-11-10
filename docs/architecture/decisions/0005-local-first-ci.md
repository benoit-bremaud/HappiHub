# ADR-0005 — Local-first CI: every check runs on the laptop, no GitHub workflow

Status: **accepted** by the owner on 2026-11-10 (#410).

## Context

GitHub Actions bills the owner's account since October 2026 (Free plan, 2 000 minutes a month
exceeded in October and November). The owner rule of 2026-11-07, every repository: every check runs
locally; the only workflow allowed is a production deploy triggered by a signed release tag
(agents-skills ADR-0004, tracked by agents-skills#259). HappiHub deploys nothing from GitHub and has
no environment yet (#386), so no workflow stays at all.

Before this decision the repository ran one workflow, `quality-tests.yml` (collector unit tests,
server unit suite with coverage, client suite with coverage, client build, upload of the lcov
reports; a second job ran the server integration suite against a PostgreSQL service). Branch
protection on `main` required its `test` status. A Python collector (`tools/quality/`) downloaded
the coverage artefact of each `main` push and scanned it with SonarQube in a container on a user
timer; the timer was installed but inactive, and its only input disappears with the workflow.

Constraints: free open-source tools only, deterministic (no AI agent in the loop), reproducible on
another machine, SonarQube never skipped (agents-skills #159), the pre-merge gate of
`~/.agent-rules/common.md` unchanged in substance.

## Decision

- Four tiers of skill `local-ci`, one `just` recipe each (`justfile`), tools pinned in `mise.toml`
  and `mise.lock`, hooks in `lefthook.yml`, installed by `just setup`:
  - L0 `just fast` on pre-commit: staged secrets (gitleaks), typos, shellcheck, hadolint;
    commit-msg: Conventional Commits subject.
  - L1 `just check` on pre-push (< 3 min, 40 s measured): typos, shellcheck, `lefthook validate`,
    hadolint on both Dockerfiles; the server unit suite with coverage, the client suite with the
    former CI coverage globs, the client build; the tests of the CI wiring and of the attestation;
    Semgrep Community Edition `p/default` on `server`, `client/src`, `e2e`; osv-scanner on the
    three lockfiles; gitleaks on the whole history.
  - L2 `just gate` before every merge, on the pushed head: L1, the server integration suite on a
    disposable PostgreSQL container (172 s measured, hence out of L1), `sonar-scanner` with the
    quality gate waited for, the smoke and E2E suites on the local production build (gate step 5),
    Trivy on the two Dockerfiles and on the two production images, then the
    attestation of agents-skills ADR-0003: a signed note on `refs/notes/gate` and the commit status
    `gate` on the head SHA captured before the first check.
  - L3 `just nightly` on the systemd user timer `happihub-local-ci-nightly.timer`
    (`scripts/systemd/`): L1, the integration suite, TruffleHog on the history, `mise outdated`.
- `just merge <pr>` is the only merge path: it refuses unless the PR head carries the attestation,
  verified against `.github/allowed_signers` read from `origin/main`.
- `.github/workflows/` is deleted; the target branch protection on `main` requires the `gate` commit
  status only, with an up-to-date branch and linear history (`.github/branch-protection.md`). Until it
  is applied, `main` still requires the `test` status of the deleted workflow.
- The SonarQube collector (`tools/quality/`, its tests, systemd units and config) is removed:
  `just gate` scans the pushed head with every lcov report (D1 of #410, option A 450/500 against
  keeping it dormant 295 and rewriting it for `main` 245). `docs/SONARQUBE.md` describes the
  local scan.
- Known advisories without an in-scope fix are waived per advisory in `osv-scanner.toml`, each with
  a follow-up issue and an expiry (D2, A 385/500: #411 for the server packages, #413 for react-router 7, 2026-12-10). The
  Semgrep rule `gcm-no-tag-length` is excluded in `just security` until #412 declares
  `authTagLength` on the field cipher (D3, A 415/500).
- No `deploy` or `attest staging` recipe: they come with the staging design (#386).

## Consequences

- Semgrep is the one unpinned input: `p/default` is fetched from the registry at each run and
  `uvx semgrep@1.184.0` carries no checksum, so a finding can appear without a commit and the
  pre-push needs the network. Accepted for a Community Edition rule set; a committed snapshot is the
  remedy if it ever flaps.
- No GitHub minute is spent; a merge needs a laptop with Docker, the self-hosted SonarQube and the
  owner's SSH key loaded. The first merge after this decision cannot verify the attestation
  (`allowed_signers` is not on `main` yet) and goes through the bootstrap waiver of the owner rule,
  with the `test` requirement still in place; the owner applies `.github/branch-protection.md`
  right after that merge, otherwise every later `just merge` is refused for a missing `test` status.
- The clone the nightly unit points to must be a full clone: TruffleHog cannot read a partial
  (`blob:none`) clone, and `just nightly` refuses one with the conversion command.
- The pre-merge gate keeps the same substance (tests, coverage floors, SonarQube, secrets,
  E2E/smoke) and becomes a single attested command; `review-local` runs `just check` before the
  push and `just gate` before the merge.
- A squash merge creates an unattested `main` commit: `just gate` runs again on `main` before any
  staging deploy, once one exists.
- #400 (E2E suites in GitHub CI) is closed: the suites run in `just gate`.
- Per-project SonarQube token `project-happihub-collector-2026` and the fine-grained GitHub token of
  the collector have no reader left: revoke them (owner action, skill `infra-accounts`).
- The waivers of `osv-scanner.toml` expire on 2026-12-10; `just check` turns red that day unless
  #411 landed or the entries were reviewed.
