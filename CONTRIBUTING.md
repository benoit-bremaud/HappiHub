# Contributing to HappiHub

Read [AGENTS.md](AGENTS.md), [handover](docs/HANDOVER.md), [work plan](docs/WORK_PLAN.md)
and the relevant accepted conception before making changes. This root guide is the
current contributor and pull-request authority. The older guide in docs/archive/CONTRIBUTING-legacy.md is historical.

## Design and approval

Start with an issue defining the need and acceptance criteria. Complete the detailed
specification and proportional UML, review requirements/traceability, Clean/SOLID,
KISS/YAGNI/DRY, patterns and security, and obtain Benoit's explicit validation before
implementation. This also covers demo tooling, configuration and migrations.
Roadmap agreement does not authorize implementation.

## Local setup and configuration

Clone https://github.com/benoit-bremaud/HappiHub.git and work from its root.
Use a dedicated branch from main.
There is no root package.json. Install server and client packages separately with
`npm ci --ignore-scripts` from each directory. Follow [configuration](docs/CONFIGURATION.md)
and [Docker workflows](docs/DOCKER.md) for the supported runtime and exact settings.

Copy server/.env.example to a private ignored server/.env.local using `cp` on Linux/macOS
or `Copy-Item` in Windows PowerShell. For standalone local startup, set the DEV database,
port and exact browser origin values plus a newly generated private SESSION_SECRET_DEV
of at least 32 random bytes. Configure the active DEV keys and add SESSION_SECRET_DEV privately; do not use unrelated PROD/TEST settings for local mode. For local Docker use the separate
ignored server/.env.docker.local described in the Docker guide. The browser API URL
includes /api and must match the chosen local topology. Never put secrets in client configuration.

Only placeholder examples belong in Git. Do not commit .env files, credentials, sessions
or raw private inventories. Test against isolated synthetic data, never production.

## Local CI — the four tiers

Every check runs on the laptop and in the git hooks; the repository has no GitHub workflow
([ADR-0005](docs/architecture/decisions/0005-local-first-ci.md), skill `local-ci`). Once per clone:
`mise trust mise.toml && mise x -- just setup` (pinned tools from `mise.toml`, the three `npm ci`,
Chromium for Playwright, the lefthook hooks). Run the tiers as `mise x -- just <tier>` when the
shell does not activate mise.

| Tier | Command | When | Holds |
|---|---|---|---|
| L0 | `just fast` | pre-commit hook (< 10 s) | staged secrets (gitleaks), typos, shellcheck, hadolint; commit-msg: Conventional Commits subject |
| L1 | `just check` | pre-push hook (< 3 min, ~40 s) | typos, shellcheck, `lefthook validate`, hadolint; server unit suite with coverage, client suite with coverage, client build; the wiring and attestation tests; Semgrep CE, osv-scanner (waivers in `osv-scanner.toml`), gitleaks on the history |
| L2 | `just gate` | on the pushed head, before every merge (10–15 min) | L1, `just integration` (server integration suite on a disposable PostgreSQL, 80 % branch floor), SonarQube with the quality gate waited for ([SONARQUBE](docs/SONARQUBE.md)), the smoke and E2E suites on the local production build ([spec](docs/architecture/specs/e2e-smoke-tests.md)), Trivy on the compose/Dockerfile configuration and the two images; then the signed gate attestation on the head SHA |
| L3 | `just nightly` | systemd user timer `happihub-local-ci-nightly.timer` (`scripts/systemd/`) | L1, the integration suite, TruffleHog, `mise outdated` |

The nightly timer is installed by hand once per machine: edit `WorkingDirectory=` in
`scripts/systemd/happihub-local-ci-nightly.service` if the clone lives elsewhere, then
`systemctl --user link "$PWD"/scripts/systemd/happihub-local-ci-nightly.{service,timer}
"$PWD"/scripts/systemd/happihub-local-ci-nightly-failed.service && systemctl --user enable --now
happihub-local-ci-nightly.timer`. Branch protection of `main`: [`.github/branch-protection.md`](.github/branch-protection.md).
References to skills and to `agents-skills` point at the owner's `~/.claude` tooling, not at this repository.

`just merge <pr>` is the only merge path: it refuses unless the PR head carries the gate attestation
(signed note on `refs/notes/gate` + commit status `gate`, verified against `.github/allowed_signers`
read from `origin/main`). Needs Docker, `sonar-scanner` on `PATH`, the SonarQube token file and
the signer's SSH key in `ssh-agent` (`git config gpg.format ssh`, `user.signingkey`).

The underlying commands still work alone. From server/: `npm test -- --runInBand` and
`npm run test:integration` (the PostgreSQL image digest is pinned in several files: bump every pin
listed by `git grep -nE 'postgres:[^ ]*@sha256'` together). From client/:
`CI=true npm test -- --watchAll=false --runInBand` and `npm run build` (on PowerShell set
`$env:CI='true'` first). From e2e/ (Linux/macOS, Docker required): `npm test` builds the production
client, starts the API on a disposable PostgreSQL with the demo seed, and runs the smoke and E2E
suites; `npm run smoke` runs the smoke suite alone. Ports 3100 and 5100 must be free
(`E2E_WEB_PORT`, `E2E_API_PORT` override them). There are no dedicated lint/typecheck scripts; do not
report them as passing. The client build runs its configured lint checks and currently has
documented legacy warnings.

## Verification and style

Use named exports for new/touched modules, never introduce TypeScript any, and test
meaningful behavior against approved acceptance criteria. Keep architecture proportional.
Do not add speculative layers, inline styles, hardcoded design values or unsafe input handling.

## Git and review

Use Conventional Commits: `<type>(<scope>): <description>`. Never commit directly to main.
Before every push review the full origin/main...HEAD diff, classify findings and resolve
all Must Haves with verified checks. Explicit owner authorization is required for pushing,
PR creation, merging, deletion, force-push, external messages and CI/CD changes. Authorization
already given for a concrete operation does not need to be requested again.

Create PRs with main as base. Assign benoit-bremaud, use existing relevant labels, and attach
to [HappiHub Project #6](https://github.com/users/benoit-bremaud/projects/6) via GraphQL
(project ID PVT_kwHOB8rwIc4AkXrp). Request clement-machtelinckx when the owner requests
Clement review; no hosted reviewer runs (owner rule 2026-11-07). Carry a milestone only from a linked issue when
its scope matches. Never route this repository to an unrelated project.

Maintain docs/HANDOVER.md and PROJECT_LOG.md when substantive state or decisions change.
Record merged/released status only after it happens. Address PR review concerns with the
owner before fixes; never silently resolve conversations or merge.

## Pull-request description

Use these sections in English, scaled to the actual change:

- Summary: concrete problem and resulting behavior.
- Related issues: distinguish delivered fixes from referenced future studies.
- Changes: substantive source, configuration and documentation changes.
- Change type: applicable Conventional Commit types.
- Checklist: conception approval where required, local full-diff review, meaningful tests,
  client build and documentation; mark unavailable or inapplicable checks explicitly.
- Screenshots: when useful for UI changes; do not substitute them for verification.
- Additional notes: evidence links, limitations and remaining work.
- Breaking changes: affected contracts, migration/configuration actions and rollback limits.

Put `Closes #N` at the end only for genuinely delivered issue acceptance criteria.
Backlog consolidation closes superseded tasks as not_planned and preserves replacement links.
