# Contributing to HappiHub

Read [AGENTS.md](AGENTS.md), [handover](docs/HANDOVER.md), [work plan](docs/WORK_PLAN.md)
and the relevant accepted conception before making changes. This root guide is the
current contributor and pull-request authority. The older docs/CONTRIBUTING.md is historical.

## Design and approval

Start with an issue defining the need and acceptance criteria. Complete the detailed
specification and proportional UML, review requirements/traceability, Clean/SOLID,
KISS/YAGNI/DRY, patterns and security, and obtain Benoit's explicit validation before
implementation. This also covers demo tooling, configuration and migrations.
Roadmap agreement does not authorize implementation.

## Local setup and configuration

Clone https://github.com/benoit-bremaud/HappiHub.git and work from its root.
Use a dedicated branch from main; the existing recovery branch is fix/security-boundaries.
There is no root package.json. Install server and client packages separately with
`npm ci --ignore-scripts` from each directory. Follow [configuration](docs/CONFIGURATION.md)
and [Docker workflows](docs/DOCKER.md) for the supported runtime and exact settings.

Copy server/.env.example to a private ignored server/.env.local using `cp` on Linux/macOS
or `Copy-Item` in Windows PowerShell. For standalone local startup, set the DEV database,
port and exact browser origin values plus a newly generated private SESSION_SECRET_DEV
of at least 32 random bytes. Configure the active DEV keys and add SESSION_SECRET_DEV privately; do not copy historical
JWT keys or use unrelated PROD/TEST settings for local mode. For local Docker use the separate
ignored server/.env.docker.local described in the Docker guide. The browser API URL
includes /api and must match the chosen local topology. Never put secrets in client configuration.

Only placeholder examples belong in Git. Do not commit .env files, credentials, sessions
or raw private inventories. Test against isolated synthetic data, never production.

## Verification and style

From server/: `npm test -- --runInBand` and `npm run test:integration`.
From client/: `CI=true npm test -- --watchAll=false --runInBand` and `npm run build`
(on PowerShell set `$env:CI='true'` first). Run the appropriate checks before pushing.
There are no dedicated lint/typecheck scripts; do not report them as passing.
The client build runs its configured lint checks and currently has documented legacy warnings.

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
Clement review; Copilot is best-effort. Carry a milestone only from a linked issue when
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
