# HappiHub prioritized work plan

Updated: 2026-10-19. This plan orders the work; it does not approve implementation.
Owner: Benoît. Clément/Yazii contributes to product and visual-design review.

## Product direction and decision status

HappiHub helps people bring communities together through events. The current focus is
organizer management, with particular attention to creation, editing and presentation.
Other websites should be able to use those event capabilities through their own servers.
HappiHub's website and external integrations must share authoritative event rules.

| Direction | Status |
| --- | --- |
| Keep the HappiHub name and existing repository | Confirmed by owner |
| Preserve culture, sharing and community as the original purpose | Documented in the original README |
| Prioritize organizer management and a strong event editor | Confirmed direction |
| Support external website servers using the API | Confirmed direction; detailed authorization model unresolved |
| Combine useful competitor ideas into one coherent product | Confirmed ambition; feature priorities and behavior unresolved |
| Complete and approve UML conception before any code implementation | Mandatory owner instruction |
| Revisit visual design and obtain Clément's feedback | Requested; review not held |
| Original logo, about ten demo events, dedicated local test credentials | Requested; implementation plan not approved |
| Target audience and first-release scope | Validated 2026-10-15 (V1 product framing) |
| Database | PostgreSQL (ADR-0003, 2026-10-16) |
| Business model and hosting | Unresolved |

The existing [resumption specification](architecture/specs/event-platform-resumption.md)
is an earlier proposal, not the final product specification. Its historical baseline must
not be interpreted as current behavior. [Current API contracts](API_DOCUMENTATION.md)
and dated verification reports describe the implementation.

## Mandatory implementation gate

For every new implementation or change in behavior:

1. Define the need, scope, acceptance criteria and open decisions.
2. Complete the written specification and its UML conception before writing code.
3. Detail data, validation, permissions, algorithms, contracts, dependencies, errors,
   concurrency, migrations, operational constraints and planned tests as applicable.
4. Review requirements/traceability, Clean/SOLID, KISS/YAGNI/DRY, pattern fit, security,
   and consistency between diagrams and specifications.
5. Obtain Benoît's explicit approval of the completed conception.
6. Implement the accepted version, verify it, and present the result for acceptance.

Approval of the ambition, roadmap, feature idea or mockup is not approval of the full
conception. A design gap discovered during coding requires an updated and revalidated
affected study before continuing that code. These rules also apply to demo tooling,
technical migrations and frontend integration of the logo.

## Work in priority order

| Order | Priority | Workstream | Deliverable and completion condition | Dependencies |
| --- | --- | --- | --- | --- |
| 1 | P0 | Complete product framing | Accepted purpose, target organizers, participant/integrator needs, real scenarios, success measures, constraints and exclusions | Current brainstorming |
| 2 | P0 | Finish evidence-based feature prioritization | Competitor/source register, evidence limitations, feature candidates, confidence and a proposed first-release boundary | Audience hypotheses from 1; research may run alongside framing |
| 3 | P0 | Resolve event ownership, lifecycle and integration boundaries | Decisions on organizations/co-organizers, event ownership, publication destinations, visibility, moderation, participation and delegated versus organization-owned API access | 1–2 |
| 4 | P0 | Complete functional, API and UML conception | Authoritative specifications, diagrams, API contracts, data model, architecture decisions, migration strategy and requirement-to-test traceability | Accepted scope and decisions from 1–3 |
| 5 | P0 | Review and validate conception | Reviewed design package and explicit owner acceptance of the scope/version to implement | 4; incorporate interface concepts where relevant |
| 6 | P1 | Finish technical/security readiness | Reviewed study and implementation of the necessary dependency/toolchain repairs; review existing security work; applicable security checks and Docker compatibility verified | Technical conception and approval before changes; can be studied alongside 1–4 |
| 7 | P1 | Define user journeys and visual identity | Editor/dashboard/public-page wireframes, accessible component states, logo alternatives, visual direction and Clément's recorded feedback | Accepted brief; concepts can inform 4–5 without code |
| 8 | P1 | Prepare a reproducible local demonstration | Approved demo-tooling conception, then repeatable synthetic seed, local credentials and representative event covers on the existing site | Specific UML/spec approval plus readiness from 6 |
| 9 | P1 | Implement the first complete event workflow | Accepted end-to-end creation/editing/publication workflow through the website and agreed server-to-server API operations | 5–7; scope selected at 2, no feature implementation authorized yet |
| 10 | P2 | Add validated organizer-management capabilities | Separate approved studies and increments for collaboration, participation, communication and recurring events, ordered by target-user evidence | Core workflow; first-release necessities may be promoted to 9 |
| 11 | P2 | Add validated expansion capabilities | Studies for ticketing/payments, community discovery, optional embeds, analytics and AI assistance where justified | Validated demand and relevant ownership/operational rules |
| 12 | P3 | Acceptance, launch and ongoing operation | Critical journeys accepted, API integration exercised, security/quality checks passed, deployment authorized, backup/restore and recovery verified, support ownership established | Readiness work starts earlier; launch follows acceptance |

P0 defines what to build and blocks feature coding. P1 makes the selected scope usable
and verifiable. P2 expands it based on evidence. P3 is the launch milestone, not permission
to postpone security, privacy, accessibility or recovery design until deployment.
No delivery dates are committed before scope and effort are established.

## Conception package details

- Actor-goal use cases for visitors, participants, organizers, collaborators, administrators
  and external integrations, with alternatives and error paths.
- Class/domain model for events, organizations, accounts, participation, media and any
  other entities actually selected for the scope.
- State diagrams distinguishing event lifecycle, visibility and moderation, plus registration
  lifecycles if included. Existing pending/approved/rejected states are moderation states,
  not a complete draft/published/cancelled lifecycle.
- Sequence/activity views for creation, save/edit, preview/publication, permissions,
  integration calls and critical participant operations, including retries and concurrency.
- Component/dependency and deployment views explaining the UI, API, domain rules,
  persistence, authentication, media, background work and selected external services.
- Privacy data-flow views with personal/sensitive data, trust boundaries and retention rules.
- Detailed API contracts, integration authentication/access scopes, validation/errors,
  compatibility policy, quotas, duplicate-request protection and change notifications
  where selected. Server-to-server access is not automatically authorized by browser sessions.
- Database decision: done, PostgreSQL with a fresh start (ADR-0003,
  [data/migration study](architecture/specs/v1-data-migration.md)).
- Requirement/use-case/diagram/API/test traceability, security rules, acceptance scenarios,
  unresolved assumptions and concrete module responsibilities.

Each diagram must answer a design question. Completeness means the accepted behavior can
be implemented without guessing; unrelated diagrams or speculative layers do not help.

## Folder architecture and quality requirements

The owner explicitly requests a folder-structure review inspired by Clean Architecture,
SOLID and anti-pattern detection, with no unjustified duplication. The conception must
define module responsibilities, permitted dependency direction and existing-to-target file
placement. Preserve proportionality: no speculative layers or generic frameworks.
See the [current folder audit](architecture/folder-architecture-audit-2026-10-12.md) for
verified duplication/coupling/configuration findings and the planned design gate.

A local SonarQube server runs the pre-merge quality gate ([SONARQUBE](SONARQUBE.md)).
Architecture review remains semantic as well as automated. File moves, pipeline changes
and refactoring still need their own approved conception (see #295).

## Feature selection method

Keep feature availability, self-reported need and observed usage separate. No reliable
cross-platform ranking of the most-used competitor features has been established.
The earlier comparison identifies candidates, not measured popularity.

For each candidate, record the target segment, actual problem, sources and dates,
confidence, frequency, consequence of failure, expected improvement, dependencies,
implementation effort and ongoing operational cost. Mandatory access/privacy/integrity
requirements are gates rather than optional popularity scores.

Compare optional features on target-user value, strength of evidence, fit with the
website/API direction, usability and delivery/maintenance effort. Use provisional scores
until interviews, prototype tests or usage measurements provide stronger evidence.
Clément's and Benoît's feedback informs design but does not establish market-wide adoption.

Candidate core: guided creation, drafts, editing, structured formatting/media, preview,
explicit publication/visibility, organizer access and corresponding integration operations.
Participation and collaboration belong in the first release if the accepted scenarios
require them; their complete scope remains to be decided.

## Logo and local demo

The smiling-H concept remains a proposal. Explore an original mark/wordmark/favicon,
readability at small sizes, light/dark use and consistency with the community purpose.
Clément reviews the direction before final identity acceptance. The broader redesign
remains separate from a small demo presentation increment.

Plan approximately ten varied public fictional events, original cover illustrations,
and separate private/pending fixtures for visibility checks. Local organizer, participant
and second-organizer accounts must exercise normal authentication and ownership rules.
Generated passwords belong in ignored private local files. The seed must refuse production,
target a designated demo database, preserve unrelated data and be safe to rerun.

## Established baseline and remaining readiness

Merged to main (not a deployed release): the security/configuration/Docker/session recovery
(PR #257), V1 brick D accounts and associations (PR #276) and brick B event lifecycle
backend UC15–UC20 (PR #282), on PostgreSQL.

- Latest recorded verification (2026-10-19): 65 unit and 97 PostgreSQL integration server
  tests, 36 client tests, SonarQube gate passed, gitleaks clean, API QA transcript.
- Not implemented: the event client (#252), partner/external API authentication, booking
  or payment, logo and demo dataset. QA bugs #283–#292 and audit follow-ups #294–#296 are open.
- PR creation, merge and CI/CD changes require explicit approval.
- Prepare deployment topology, image/security checks, private configuration, backup/restore
  and recovery before real external use. No production rollout is authorized by this plan.

Evidence: [session migration](architecture/session-migration-2026-10-12.md),
[dependency remediation](architecture/dependency-remediation-2026-10-12.md),
[Docker workflows](DOCKER.md), and
[completed backlog cleanup](architecture/backlog-audit-2026-10-12/completion.md).

## Research references

- [Original project purpose](../README.md) and [community standards](CODE_OF_CONDUCT.md).
- [Eventbrite API](https://www.eventbrite.com/platform/new/api).
- [Luma registration](https://help.luma.com/p/event-registration-process).
- [pretix API concepts](https://docs.pretix.eu/dev/api/fundamentals.html).
- [HelloAsso API overview](https://dev.helloasso.com/docs/api-overview).
- [Mobilizon event creation](https://docs.mobilizon.org/1.%20Use/Events%20and%20Activities/1.create-events/).
- [Meetup product retrospective](https://www.meetup.com/blog/2025-meetup-progress-report/).
- [Solidatech 2025 association survey](https://www.solidatech.fr/ressources/etude-la-place-du-numerique-dans-le-projet-associatif-en-2025/).

## Continuity and handover

Read [project instructions](../AGENTS.md), [current handover](HANDOVER.md), and
[operational history](../PROJECT_LOG.md) before resuming. Maintain these alongside the
accepted specifications and evidence reports; a future contributor must be able to
identify implemented behavior, proposals and missing approvals without chat history.

## Immediate next work

V1 conception is approved (implementation gate 2026-10-16); bricks D and B are merged.
Next: the event client (#252) or the persona scenario study, each after its own conception
is approved; the P1 QA bug #283 is fixed (PR #299, db6a4df). See [HANDOVER](HANDOVER.md) for the live state.
