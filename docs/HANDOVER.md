# HappiHub handover

Updated: 2026-10-16. The backlog is reconciled and the recovery branch is published for review.
No further application code is authorized without the owner's completed UML approval gate.

## Read in order

[Project instructions](../AGENTS.md), [work plan](WORK_PLAN.md), [operational history](../PROJECT_LOG.md),
then the specification/ADR relevant to the next task. Read [API contracts](API_DOCUMENTATION.md)
for current behavior, not historical tutorials or old issue titles.

## Git state and ownership

Repository: benoit-bremaud/HappiHub. On the current machine the working checkout is
`/home/vev/Documents/02_personal/HappiHub`; the chat's default directory may differ.
At this check GitHub main and origin/main both resolve to
`e3e90078920ee00c776c916ac7ede45e4e22cfc0`.
Recovery branch: fix/security-boundaries. Latest implementation commit: c831c6b;
accepted session-design commit: 45b5c15. The authorized recovery work is pushed and submitted as
[PR #257](https://github.com/benoit-bremaud/HappiHub/pull/257), with clement-machtelinckx requested as reviewer.
The PR is attached to HappiHub Project #6 as In review/P1. Existing repairs have not been
merged or deployed. Documentation updates may appear as working-tree
changes or later documentation commits: inspect git status/log at resumption.

Owner: Benoît (benoit-bremaud). Retained collaborator: Clément/Yazii
(clement-machtelinckx). See the dated cleanup evidence for permission changes; verify live
access before claiming it remains unchanged. Private GitHub Project membership was not
independently verified. The owning Project is
[HappiHub Project #6](https://github.com/users/benoit-bremaud/projects/6), with
[framing epic #58](https://github.com/benoit-bremaud/HappiHub/issues/58).

## Backlog and publication status

The authorized second cleanup audited all 121 previously open issues: 38 retained,
83 closed as superseded/not_planned and archived, 15 new studies/delivery tasks (#242–#256).
Fresh verification found 53 open issues/cards, 38 Backlog and 15 In review, all prioritized,
with obsolete dates removed. See the [full reconciliation](architecture/roadmap-backlog-reconciliation-2026-10-12.md)
and [publication review](architecture/recovery-publication-review-2026-10-12.md).
The Project additionally contains PR #257 (54 active cards: 53 issues plus the PR).
Restoration #256 awaits PR acceptance; no feature code is authorized by these issue updates.
Raw earlier audit exports remain untracked and must not be bulk-staged.

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

React 18/CRA client, Express 4 API, Mongoose 8/MongoDB. The application has public approved
non-private event reads, owner boundaries, ordinary signup/login, profile changes,
comment creation/listing and participation. HttpOnly cookie sessions use express-session
and connect-mongo. CSRF applies to all writes, login regenerates identifiers, logout revokes
the stored session and password changes invalidate existing authenticated sessions.

A complete event editor, event-content update route, draft/publication lifecycle,
external integration authentication, organization collaboration, booking/payment system,
logo and expanded demo dataset have not been implemented.

Latest recorded verification: 86 fast server tests, 14 disposable real-Mongo tests,
18 client tests, client build, local/HTTPS Docker browser flows and persistence across
an API process restart. Fast server, Mongo integration, client tests and client build were rerun for publication
and passed. Earlier container/browser/restart checks remain recorded evidence.
The [session report](architecture/session-migration-2026-10-12.md) contains limits.

Last recorded dependency audit: runtime server zero findings, full server tree 33 affected
entries, client 104. Counts are dated and include dependency chains. CRA/Jest migration,
remaining quality warnings, image/security scans and deployment/backup readiness remain
open. Do not represent the whole project as security-complete.

## Documents and their authority

| Document | Use |
| --- | --- |
| WORK_PLAN.md | Current prioritized sequencing, approval boundaries and unresolved scope |
| PROJECT_LOG.md | Operational decisions and verified historical integrations |
| API_DOCUMENTATION.md | Actual API behavior on the local recovery branch |
| architecture/specs/cookie-sessions.md and ADR-0001 | Accepted session conception |
| architecture/specs/event-platform-resumption.md | Earlier proposal, not an approved feature specification |
| Dated architecture audit/remediation reports | Evidence at the time of each activity |
| changelog/CHANGELOG.md | Unreleased product changes and retained legacy version notes |
| FAQ.md, GUIDE.md, JWT tutorial | Legacy guidance, not current runtime authority |

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
#41 must include the responsibility/path map and dependency UML; #248/#25 cover the later
quality-tooling study. SonarQube is deferred; no scanner/setup or structural code changes
have occurred. Do not interpret candidate folders as an approved implementation plan.

## Next actions

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
   Next brick: D accounts/associations conception (data access library and migration tool
   by MCDA), plus 06 update for the frozen tables. Open: email provider, hosting/backups
   (must provide EU PostgreSQL) and Géoplateforme quota (T11). Backup retention is decided with hosting.
5. Only then implement the validated increment and verify it.

Technical migration and demo-tooling studies may be prepared alongside framing, but their
code and configuration changes need their own accepted conception. Architecture and database
choices must follow requirements. The logo/visual review with Clément is a pending activity,
not a consultation already conducted or permission to contact him.

## Local runtime and safe resumption

Last retained previews: standalone web http://localhost:3100/events with API 5100,
and Docker local web http://localhost:3200/events with API 5200. Check that these services
still exist and match the checkout before using them. The standalone preview launcher was
temporary and is not a repository-supported seed/start command.

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
