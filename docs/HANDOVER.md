# HappiHub handover

Updated: 2026-10-28. The recovery work and V1 bricks D (accounts/associations), B (event
lifecycle backend) and the event client (#252) are merged to main. No further application code is authorized without the
owner's completed UML approval gate for that increment.

## Read in order

[Project instructions](../AGENTS.md), [work plan](WORK_PLAN.md), [operational history](../PROJECT_LOG.md),
then the specification/ADR relevant to the next task. Read [API contracts](API_DOCUMENTATION.md)
for current behavior, not historical tutorials or old issue titles.

## Git state and ownership

Repository: benoit-bremaud/HappiHub. On the current machine the working checkout is
`/home/vev/Documents/02_personal/HappiHub`; the chat's default directory may differ.
At this update origin/main resolves to `3c56657` (#244 partner API study, PR #327). The recovery
branch fix/security-boundaries was merged through PR #257 (`c831c6b` is in main). Inspect `git status`/`git log` and open PRs at resumption rather than trusting these SHAs.

Owner: Benoît (benoit-bremaud). Retained collaborator: Clément/Yazii
(clement-machtelinckx). See the dated cleanup evidence for permission changes; verify live
access before claiming it remains unchanged. Private GitHub Project membership was not
independently verified. The owning Project is
[HappiHub Project #6](https://github.com/users/benoit-bremaud/projects/6), with
[framing epic #58](https://github.com/benoit-bremaud/HappiHub/issues/58).

## Backlog status

The 2026-10-12 cleanup audited all 121 then-open issues (38 retained, 83 closed, 15 new studies
#242–#256); see the [reconciliation](architecture/roadmap-backlog-reconciliation-2026-10-12.md),
which is dated evidence. At this update 54 issues are open on
[Project #6](https://github.com/users/benoit-bremaud/projects/6). The 2026-10-19 QA pass filed
#283–#292 and the repository audit filed #294–#296 (documentation refresh, code/config
leftovers, status notes on approved architecture documents). The 2026-10-23 triage (owner MCDA
A 450/500) closed #274, #245, #114 (resolved) and #301 (duplicate of #285), retitled #292 to the
compose migrations gap and labelled priorities: P1 #310, #244, #251; P2 #284–#291, #302–#308,
#272, #263; P3 #273, #295, #296, #298, #292; the 2024 umbrella studies stay in the icebox. Issue updates never authorize
feature code. Raw earlier audit exports remain untracked and must not be bulk-staged.

## Current accepted directions

- Preserve HappiHub's community/cultural purpose and name.
- Prioritize organizer management, with an effective event creation/editing/formatting tool.
- Support external website servers consuming the event backend API.
- Study a coherent combined feature set inspired by relevant competitors and actual needs.
- Complete detailed UML conception and receive explicit owner validation before code.
- Revisit visual identity with Clément; logo and expanded local demo remain pending.

These are direction decisions. Since 2026-10-15 the V1 audience (cultural associations),
first-release scope, organization model, publication destinations and partner API
authorization are owner-validated in the [V1 product framing](architecture/specs/v1-product-framing.md)
and [user journeys](architecture/specs/v1-user-journeys.md). Business model and hosting
are not approved decisions; the database is PostgreSQL (ADR-0003, 2026-10-16).

## Implemented local baseline

React 18/CRA client; Node 22 ESM Express 4 API on PostgreSQL (`pg`, `node-pg-migrate`
migrations in `server/migrations`, `npm run migrate`). HttpOnly cookie sessions use
express-session with `connect-pg-simple`; CSRF applies to all writes. Implemented: accounts
(signup, email verification, sign-in, profile, export, deletion), associations with
invitations and memberships (brick D), and the event lifecycle backend UC15–UC20 (drafts,
concurrent edit merge, publish, cancel, delete, public read, maintenance job; brick B).

Event client (#252): merged 2026-10-23 (PR #309, 8ff8177; gate: server unit 69 + integration
98, client 84, SonarQube passed, gitleaks clean, browser QA). QA leftovers: work plan "QA backlog".

Not implemented: partner/external API authentication, booking or
payment, logo and expanded demo dataset. Compose files on main use PostgreSQL; #292 needs re-checking (stale local containers).

Latest recorded verification (#252 gate, 2026-10-23): 69 unit and 98 PostgreSQL
integration server tests, 84 client tests, SonarQube gate passed, gitleaks clean, browser QA. Since #295 the CI server coverage uses the `jest.config.cjs` scope (all server modules); branch coverage is raised by #307.

Last recorded dependency audit: runtime server zero findings, full server tree 33 affected
entries, client 104. Counts are dated and include dependency chains. CRA/Jest migration,
remaining quality warnings, image/security scans and deployment/backup readiness remain
open. Do not represent the whole project as security-complete.

## Documents and their authority

| Document | Use |
| --- | --- |
| WORK_PLAN.md | Current prioritized sequencing, approval boundaries and unresolved scope |
| PROJECT_LOG.md | Operational decisions and verified historical integrations |
| API_DOCUMENTATION.md | Actual API behavior on main |
| architecture/specs/cookie-sessions.md and ADR-0001 | Accepted session conception (store superseded by ADR-0003) |
| architecture/specs/v1-*.md and ADR-0003 | Approved V1 conception and brick specifications |
| architecture/specs/event-platform-resumption.md | Earlier proposal, not an approved feature specification |
| Dated architecture audit/remediation reports | Evidence at the time of each activity |
| changelog/CHANGELOG.md | Unreleased product changes and retained legacy version notes |
| archive/ | Legacy tutorials (FAQ, GUIDE, Express, Joi, JWT), not current runtime authority |

The backlog audit snapshot contains historical remote metadata, not live issue statuses.
Do not silently promote proposals to implementation-ready tasks or mark issues Done based
only on old checkboxes. Some local snapshots are intentionally untracked; do not bulk-stage
raw exports. Curated reports and the handover carry the useful portable context.

## Research and prioritization status

A first official-documentation comparison covered Eventbrite, Luma, Meetup, HelloAsso,
pretix and Mobilizon. It identifies capability candidates, not a trustworthy ranking of
competitors' most-used features. The owner requested deeper popularity/priority analysis;
finish its synthesis before treating a first-release boundary as agreed.

[Solidatech's 2025 study](https://www.solidatech.fr/ressources/etude-la-place-du-numerique-dans-le-projet-associatif-en-2025/)
and the original [report](https://recherches-solidarites.org/wp-content/uploads/2025/11/RS-Solidatech-Rapport-2025.pdf)
provide association-wide digital-use evidence. They do not measure event-editor feature
usage. [Meetup's retrospective](https://www.meetup.com/blog/2025-meetup-progress-report/)
reports communication confusion and discovery improvements without providing a universal
feature-usage ranking. Keep sample, date, segment and confidence attached to conclusions.

## Architecture follow-up requirement

The owner reinforced folder organization, Clean/SOLID, anti-pattern checks and removal
of unjustified duplication. A [read-only folder audit](architecture/folder-architecture-audit-2026-10-12.md)
records verified CSS/request duplication, responsibility boundaries and stale configuration.
#41 must include the responsibility/path map and dependency UML. A local SonarQube server
is in use for the pre-merge gate ([SONARQUBE](SONARQUBE.md)). Do not interpret candidate
folders as an approved implementation plan.

## Next actions

#366 public agenda (UC21): visitors browse upcoming events on the home page without an account ([spec](architecture/specs/public-agenda.md), PR #369). Next: #367 visual design brainstorm with the owner (mobile first), #368 shared `useSend` hook. UI rule: always mobile first.

QA backlog from the 2026-10-24 inspector pass: #319 (edge security headers) and #320 (source maps)
are fixed and merged (PR #326, squash `9cb6a3d`, both issues closed); #321–#324 (P3) remain.
#244 partner API conception validated and merged 2026-10-24 (PR #327, `3c56657`, [spec](architecture/specs/partner-api.md));
its implementation is a later brick. #251 test-environment conception validated 2026-10-24, amended D8 and G1–G5 on 2026-10-26 ([spec](architecture/specs/test-environment.md)); the demo seed (`npm run seed:demo -- --confirm`) and the rejection-catalogue tests are implemented on branch `feat/demo-seed-251` (closes #251 and #345, demo domain `demo.example.com`). Global review 2026-10-24
([report](architecture/review-global-2026-10-24.md)) added P1 bugs #328, #329 and CI gaps #295, #307. #328 is merged (PR #342, `96e5535`, follow-up #341); #329 current-password reservation is fixed in its PR ([spec](architecture/specs/current-password-reservation.md)).

1. Done 2026-10-15: V1 framing, personas and journeys J1–J6 validated.
2. Research synthesis is superseded for V1 by the validated framing.
3. Done 2026-10-15: audience, first-release scope, ownership and publication choices.
4. Produce the full functional/API/data/UML conception, review it, obtain approval.
   V1 package status (2026-10-15): framing, journeys, use cases, class, state, sequences and
   component and personal-data flow (06, DF1–DF5) diagrams validated; traceability matrix
   and final review #247 validated ([v1-traceability](architecture/specs/v1-traceability.md),
   T1–T9 resolved, T10–T11 open). Implementation gate approved 2026-10-16 for `798b323`
   ([gate](architecture/specs/v1-implementation-gate.md)); first brick: #246 data/migration study,
   then accounts/associations, event lifecycle backend, partner API.
   Done 2026-10-16: #246 data/migration study ([study](architecture/specs/v1-data-migration.md),
   ADR-0003): PostgreSQL, fresh start, frozen features as two tables; T10 resolved.
   Brick D conception decided 2026-10-16 ([spec](architecture/specs/v1-brick-d-accounts-associations.md)):
   `pg` + `node-pg-migrate` + `connect-pg-simple`, scope S1–S3 and the 06 amendment approved
   by Benoît (§ 9). Done 2026-10-16: brick D merged (PR #276, dd4ead9); amendments A-D1–A-D5
   and S1-C validated. Brick B (event lifecycle backend, UC15–UC20) conception decided 2026-10-16 ([spec](architecture/specs/v1-brick-b-event-lifecycle.md)): Benoît validated S, A1, Q, V, P (top scores). Spec merged as PR #278 (8dd08ad). Done 2026-10-19: brick B implemented and merged (PR #282, 47b8cde), server only; amendments A-B1–A-B4 in spec § 12; local gate green ([review-local](architecture/review-local.md)). QA on 2026-10-19 filed client/compose bugs #283–#292 (backlog; #283 P1 leave/resend 415: fixed by PR #299, merge db6a4df). Owner vision for persona scenarios and external API clients (Brasse-Bouillon, theatre sites) recorded on #20, #251, #244. Repository audit 2026-10-19 filed #294–#296.
   Done 2026-10-23: event client #252 merged (PR #309, 8ff8177).
   #310 encryption at rest: conception validated 2026-10-23
   ([spec](architecture/specs/db-encryption-at-rest.md), ADR-0004 accepted). Implementation on
   `feat/310-db-encryption`, merged (PR #312, `b1445c5`); one design gap (Compose production
   transport, socket volume option A 425/500) validated 2026-10-23 and recorded in spec § 7. Then #244 partner API and #251 persona scenarios (P1), each after conception approval.
   T11a blocks deployment. Open: email provider, hosting/backups (must provide EU PostgreSQL) and Géoplateforme quota (T11). Backup retention is decided with hosting.
5. Only then implement the validated increment and verify it.

Technical migration and demo-tooling studies may be prepared alongside framing, but their
code and configuration changes need their own accepted conception. Architecture and database
choices must follow requirements. The logo/visual review with Clément is a pending activity,
not a consultation already conducted or permission to contact him.

## Local runtime and safe resumption

No preview is guaranteed to be running. Local run used for the 2026-10-19 QA: a disposable
PostgreSQL container, `npm run migrate` then `npm start` in `server/` (API 5000) and
`npm start` in `client/` with `REACT_APP_API_URL=http://localhost:5000/api` (web 3000).
Since #310 the API also needs a field keyring: `npm run keyring:generate -- .keys/field-keyring.dev.json`
and `FIELD_KEYRING_FILE_DEV` ([configuration](CONFIGURATION.md)); recreate pre-#310 databases.
In development, emails (verification, invitations) are printed in the server log.

Follow [configuration](CONFIGURATION.md) and [Docker workflows](DOCKER.md) for reproducible
startup on another machine. Supply a new private session key and a designated local database.
Existing preview credentials are synthetic temporary fixtures documented in the session
report; the requested durable dedicated demo accounts are not yet implemented.

The disposable production validation stack/proxy were stopped and synthetic volumes retained.
No production release was performed. Never terminate unrelated port occupants, connect tests
to a real database, delete volumes, copy historic signing keys, or infer release status from
package.json versions or the old changelog label. GitHub currently returned no tags/releases.

## Continue documentation discipline

Update this handover when current state/next steps change. Record substantive decisions,
merges and releases in the operational journal with evidence. Preserve dated audit reports
as history and correct misleading guidance with links to the current authority. Keep
secret values out of the continuity files.
