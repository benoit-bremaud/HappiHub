# HappiHub project log

Chronological operational history for maintainers and future contributors.
Latest entries appear first. Product/release changes belong in the changelog;
current work and next actions belong in [the work plan](docs/WORK_PLAN.md) and
[the handover](docs/HANDOVER.md).

## 2026-10-24

- **#251 test environment — conception validated** — [spec](docs/architecture/specs/test-environment.md),
  diagrams `docs/architecture/diagrams/test-environment/`. Owner chose D1 Node seed job through the
  services (435/500, keeps ADR-0004 encryption), D2 generated per-machine passwords in an ignored
  `0600` file (415, closest: fixed `.env.example` passwords 395), D3 idempotent upsert in the reserved
  `demo.happihub.test` namespace (460), D4 valid database states plus a rejection catalogue run by
  the integration suite (460, also feeds #307), D5 DEV tier, `_demo` database name and `--confirm`
  guard (460). review-local corrected the rejection catalogue against the code and added D6
  (clock injection + maintenance job, SQL only for the moderation flag, 460). PR #340 review: expired/revoked invitations are rejection cases only, public reads stay
  open across associations, D7 idempotent rerun without an outer transaction (455). Implementation is a later brick.

- **Global local review of the whole repository** ([report](docs/architecture/review-global-2026-10-24.md)):
  every suite green locally (server unit 142, PostgreSQL integration 111 at 91.0 % stmts, client 84,
  build, gitleaks). No blocking security flaw; Must: maintenance purge race #328, current-password
  limit race #329, CI coverage globs #295 and CI without integration tests #307 (both raised to P1).
  Should/Nice filed as #330–#335. Owner chose the handling (MCDA A 450/500).
- **#244 merged** (PR #327, squash `3c56657`); follow-ups filed: webhooks #336, `externalId` sync
  #337, platform integration clients #338.

- **#244 partner API — conception validated** — branch `docs/244-partner-api-study`,
  [spec](docs/architecture/specs/partner-api.md), diagrams `docs/architecture/diagrams/partner-api/`.
  Owner chose D0 draft-only write API (370/500 over read-only 350, full write 340; sensitivity
  corrected after the vote, read-only wins at security weight 35, owner reconfirmed C), D1 scoped
  association keys (430), D2 `Idempotency-Key` 24 h (405, `externalId` upsert 400 kept as known
  trade-off), D3 no webhooks, polling `updatedSince` (450), D4 a key edits only its own drafts
  (465). Amends the V1 framing (write API) and UC27; new UC34/UC35. Implementation is a later brick.

- **#319 + #320 edge hardening — merged (PR #326, squash `9cb6a3d`; both issues closed)** — owner validated
  the [spec](docs/architecture/specs/edge-security-headers.md) (MCDA A 480/500: strict CSP with
  `INLINE_RUNTIME_CHUNK=false`, over a per-build script hash 360 and Report-Only 290).
  `client/nginx.conf`: `server_tokens off`, CSP (`script-src 'self'`, Bootstrap CDN allowed in
  `style-src` only, `connect-src 'self'` since production builds with `/api`,
  `frame-ancestors 'none'`), X-Frame-Options DENY, nosniff, Referrer-Policy `no-referrer` (aligned with Express after review-local found a
  weaker duplicate on `/api`; owner MCDA A 480/500), Permissions-Policy,
  HSTS 1 year. `client/Dockerfile`: `GENERATE_SOURCEMAP=false`. Verified on the built runtime
  image: all six headers on `/` and SPA routes, `Server: nginx` without version, 0 `.map`
  files, 0 inline `<script>`, SPA renders with no CSP violation in the browser console.
- **Inspector + security QA pass on main `b1445c5`** ([report](docs/architecture/qa/2026-10-24-inspector-pass.md)):
  probes S2–S5, S7 and S10 green. Findings filed: #319 nginx security headers, #320 source maps
  in the image, #321 X-Powered-By/nosniff, #322 JSON 404, #323 display-name hint, #324 meta description.

## 2026-10-23

- **#310 encryption at rest — implemented on `feat/310-db-encryption` (PR pending)** — pure
  `server/domain/fieldCipher.js` (AES-256-GCM, 12-byte IV, AAD `table.column`, envelope
  `hh1.<kid>.<b64url>`, HMAC-SHA256 blind index over `foldEmail`, generic `FieldCipherError`);
  `config/fieldKeyring.js` and the shared D7 check `config/databaseUrl.js` used by `server.js`,
  `runMaintenance.js`, `migrate.js` and the new `runReencrypt.js`; migration
  `1761177600000_db-encryption-at-rest.sql` replaces the clear columns without backfill; services
  per spec § 8; `jobs/reencrypt.js` (batches of 200, `FOR UPDATE SKIP LOCKED`, remaining counts);
  `npm run keyring:generate`. Design gap found while documenting: the production Compose reached
  PostgreSQL by service name, refused by D7; owner validated option A (shared Unix socket volume,
  `--auth-local=scram-sha-256`, 425/500 over defer 360, private-CA TLS 325, host allow-list 290),
  recorded in spec § 7. Tests: server unit 139, integration 107 (no-plaintext AC1, bidx
  uniqueness, AC7 erasure, rotation idempotence AC5, `sess` key allowlist D4, boot refusals
  AC4/D7), client 84. AC8: 100 decryptions ≈ 0.74 ms on Node 22.23.3.
- **#310 encryption at rest — conception study opened** — branch `docs/310-db-encryption-study`,
  spec `docs/architecture/specs/db-encryption-at-rest.md`, proposed ADR-0004 and diagrams
  `docs/architecture/diagrams/db-encryption/`. Scope chosen by the owner on 2026-10-22
  (option A, 405/500): disk/volume encryption and TLS to PostgreSQL plus application-level
  AES-256-GCM on sensitive columns with an HMAC blind index for email lookups. Owner
  validated D1–D7 (all option A): personal columns 390, keyring file 435, replace columns
  without backfill 415, session table unchanged 460, full shared HMAC blind index 470, text
  envelope with column AAD 450, loopback-or-verify-full TLS 440. After review-local (3 Must,
  4 Should fixed) the owner validated the whole conception, with staged key rotation (B 460/500
  over full stop D 415); ADR-0004 accepted. Implementation is the next brick.
- **Complementary triage (owner MCDA T2, 445/500)** — closed #58 (V1 framing validated
  2026-10-15) and #247 (V1 conception and implementation gate validated 2026-10-16) as completed;
  #242 and #243 kept open (popularity study, role promotion and ownership transfer not covered).
- **Backlog triage (owner MCDA option A, 450/500)** — closed #274, #245 and #114 as resolved
  and #301 as a duplicate of #285; #292 retitled to the compose migrations gap. New labels:
  `priority: P1` on #310, #244, #251; `priority: P2` on #284–#291, #302–#308, #272, #263;
  `priority: P3` on #273, #295, #296, #298, #292. The 2024 umbrella studies stay in the icebox.
- **#252 event client — merged (PR #309, merge 8ff8177)** — final gate on the merged head:
  server unit 69 + integration 98, client 84, SonarQube passed with the three lcov reports,
  gitleaks clean, browser QA `docs/architecture/qa/2026-10-22-252-*`. Last fix 14d1001 for
  new Sonar rules; S3800 (Joi custom validator returning two types) and S9382 (per-draft
  transaction loop) accepted in SonarQube with an owner MCDA of 500/500.

## 2026-10-22

- **#252 event client — implemented on `feat/252-event-client` (PR pending)** — conception
  validated (MCDA S 430, K 470, AS 420, R 465; spec `v1-brick-b-client-event-workflow.md`,
  diagrams `v1-event-client/`). Owner rule added mid-brick: progressive disclosure (fields
  and buttons appear from the previous choice); spec § 2 and diagram 03 amended and
  revalidated the same day. Amendments: A-B5 commune search (`GET /api/communes`), A-B6
  `lastEditedByFormerMember` (owner chose option A 420/500) after browser QA showed every
  member without a display name listed as "former member". SonarQube first failed with 147
  new issues (PropTypes, ARIA roles), all fixed. Gate: server unit 69 + integration 98
  (93.3 % statements), client 84 (92.6 %), SonarQube passed, gitleaks clean, browser QA
  screenshots `docs/architecture/qa/2026-10-22-252-*.jpg`. QA leftovers listed in the work
  plan backlog.
- **#283 bodiless writes rejected with 415 — merged (PR #299, merge db6a4df)** — browsers send
  `Content-Length: 0` on bodiless POSTs, which `type-is` counts as a body, so the CSRF
  middleware returned 415 for leave and invitation resend. Owner approved option A (MCDA
  500/500): a write is bodiless without `Transfer-Encoding` and with `Content-Length` absent or
  `0`; only a non-empty body must be JSON; origin and CSRF checks unchanged. New unit and
  integration tests fail without the fix. Local gate green: server unit 93, integration 97,
  client 36, SonarQube passed, gitleaks clean, browser QA evidence in
  `docs/architecture/qa/2026-10-19-283-*.jpg`.

## 2026-10-19

- **Repository audit and documentation refresh (#294)** — read-only audit of every tracked
  file (root/docs, docs/architecture, code/config). Owner chose option A (four sequential
  lots, 460/500). Lots 1–2 in this change: HANDOVER, WORK_PLAN, AGENTS, CONTRIBUTING, README,
  SONARQUBE, DOCKER, CHANGELOG and server/tests/README now describe PostgreSQL, the merged
  bricks D and B and the real commands; MERN/JWT tutorials moved to docs/archive/ with an
  index (`.gitleaksignore` working-tree path updated, commit-scoped fingerprints kept).
  Follow-ups: #295 code/config leftovers (CI coverage globs miss domain/services/db/jobs;
  needs a mini-spec), #296 dated status notes on approved architecture documents (owner
  decision). Compose files already use PostgreSQL, so #292 needs re-checking.
- **Brick B merged — event lifecycle backend UC15–UC20 (PR #282, merge 47b8cde)** — server
  only, within spec BC1–BC19. Owner decisions recorded as spec § 12 amendments: A-B1
  `activity_entry.detail` jsonb (485/500), A-B2 full INSEE COG 2026 commune list (460), A-B3
  plain indexes because `timestamptz + interval` is not IMMUTABLE (technical), A-B4 per-IP
  limiters 600/15 min on event writes and the public read (390). Local gate (review-local.md) green on
  4a1059c: 65 unit + 97 integration server tests, 36 client, new-code coverage 87.7 %,
  SonarQube passed, gitleaks clean, API QA transcript; after the PR-review fixes (27e1135)
  the test suites, SonarQube and gitleaks were rerun green and PR CI passed. Review fixes: membership locked on every write,
  strict dates/uuids, hidden Unicode refused, order-free edit coalescing (removed a flaky
  BC18), and from PR review a publish/account-deletion deadlock (account now locked first)
  and an end-without-start CHECK gap.
- **Local QA pass of the whole application** — browser walk of every client flow on a
  disposable PostgreSQL. Ten issues filed to the Project #6 backlog, #283–#292; #283 (P1)
  leave association and resend invitation always answer 415 from the browser.
- **Owner vision recorded** — persona-based scenarios (private run with 10 places, themed
  birthday, concert, hike, car-boot sale, fair, theatre) on #20/#251; external API clients
  (Brasse-Bouillon, theatre company sites, flyers) on #244. Conception first.

## 2026-10-16

- **CI flake fixed — server rate-limit tests timing out (PR #280, merge a161d7c)** — failed
  sign-ins compare against a cost-12 dummy hash (~313 ms each in pure-JS bcryptjs). The tests run
  20–21 sign-ins each and exceeded the 30 s Jest timeout on slow runners (run 38939962986). Benoît
  validated option B (MCDA 480/500; env-var cost 345, raised timeout 300). B is a Jest-only setup
  file `server/tests/fastBcrypt.js` that hashes at cost 4 in unit tests. No production change;
  integration tests keep cost 12. Each test now takes under 0.3 s instead of ~7 s. The local
  gate was green, including the SonarQube gate.

- **Brick B conception merged** — PR #278 merged into main (8dd08ad) after green CI and owner
  approval; branch deleted. Next: brick B implementation on its own branch, within the spec.
- **Brick B conception decided — event lifecycle backend (UC15–UC20)** — Benoît validated the
  weights and top scores of S, A1, Q, V and P on 2026-10-16; 05a and 02a notes applied.
  Local review ([report](docs/architecture/review-local-brick-b-spec.md)): 3 Must fixed — sliding-window
  `Retry-After`, additive error body `{message, code?, details?}`, and C1 drafts at closure kept
  until the 30-day purge (470/500 vs delete 315, chosen by Benoît, UC8 unchanged); Should items applied.
  [spec](docs/architecture/specs/v1-brick-b-event-lifecycle.md), branch
  `docs/brick-b-event-lifecycle-spec`. MCDA recommendations awaiting owner validation: S backend
  only, images and wizard client in later bricks (440/500; images 320, with client 280); A1
  effective end = start + 24 h when no end (450); Q creation quota counted from `event` rows (410);
  V static French commune list until T11c (450; Géoplateforme proxy 320); P six placeholder poster
  styles. Server-side field merge under a row lock, publication guard G1–G4, UC8 closure hook,
  maintenance archive and S2 draft cleanup, acceptance BC1–BC18. No code.
- **Brick D implementation — accounts and associations on PostgreSQL** — branch
  `feat/brick-d-accounts-associations`, merged into main as PR #276 (dd4ead9) after owner approval. Server: `pg`, SQL migration via
  `node-pg-migrate` (explicit `npm run migrate`), `connect-pg-simple` sessions, endpoints UC1–UC8
  and UC10–UC12, outbox with dev log transport, maintenance job (`npm run maintenance`); Mongo
  account code and dependencies removed, legacy `/events` and `/comments` answer 503 (S3);
  compose files on PostgreSQL 17.6. Client: new account, association and invitation screens.
  Tests: server unit + integration against disposable PostgreSQL (line coverage ~98 %), client
  suite and build green. Design gaps A-D1–A-D5 recorded in spec § 11, validated by Benoît the same day (invitee sign-up without association, join by invitation id, 409 for the
  5-association cap, 30-day purge of closed associations, member emails visible).
- **Brick D local review** ([report](docs/architecture/review-local.md)) — 7 Must fixed. Owner chose
  S1-C (415/500; B 400, A 370) against a pre-registration takeover: verification no longer
  signs in, sign-in requires a verified email, a password reset verifies the address (supersedes
  the "verification signs in" part of N1). The QA pass found and fixed a StrictMode bug that broke
  every verification link in development, and a console error from unused Bootstrap JS. SonarQube
  quality gate passed on ba6542b once run with a global token on the local server. PR #276.
- **Brick D conception — accounts and associations (UC1–UC8, UC10–UC12)** — owner decided by MCDA top scores
  ([spec](docs/architecture/specs/v1-brick-d-accounts-associations.md)): L1 data access `pg` (465/500; Kysely 415, Prisma 310), L2 migrations
  `node-pg-migrate` (465; Graphile 375, Kysely Migrator 335, custom 315), sessions on
  `connect-pg-simple`; scope S1 (UC9/UC13 to the administration brick, logo to the image brick),
  S3 legacy event routes disabled; 06 amended for D3 tables and pseudonymous moderation targets (approved).
  Local review then revised two points with the owner: S2 back to "5 associations in total"
  (440 vs 240) and N1 non-disclosing sign-up, the verification link signs in (335 vs 330;
  UC1 and J1 D1 amended). T11a still blocks real email delivery; brick D uses a dev-only log transport.
  Branch `docs/brick-d-accounts-associations`.
- **V1 data and migration study (#246)** — owner decided by MCDA top scores
  ([study](docs/architecture/specs/v1-data-migration.md), [ADR-0003](docs/architecture/decisions/0003-postgresql-primary-database.md)):
  D1 PostgreSQL self-hosted in the EU (435/500; fallback SQLite 385), D2 fresh start with an
  archived legacy dump (470; no production data exists), D3 frozen participation/comments
  ported as two minimal tables (395; fallback retire 360). Target schema derived from 04/06;
  legacy pending/approved/rejected, unique title index and association-less events are not
  mapped. T10 resolved; 06 inventory update for D3 pending. Branch `docs/246-data-migration-study`.
- **V1 implementation-approval gate** — owner explicitly approved the V1 conception at
  `main` @ `798b323` ([gate](docs/architecture/specs/v1-implementation-gate.md)). First
  brick by MCDA top score: #246 data/migration study (425/500; runner-up event lifecycle
  backend 290). Sequence A → D → B → C. T10, T11 remain preconditions; no code yet.
  Branch `docs/v1-implementation-gate`.

## 2026-10-15

- **V1 traceability and final conception review (#247)** — new
  [traceability matrix](docs/architecture/specs/v1-traceability.md): 33 use cases and every
  decision traced to class, state, sequence, component and data-flow elements; no orphan.
  Owner validated the MCDA top scores: T1 extend `DecisionKind` for dispute outcomes,
  automatic lifts and role changes (430/500); T2 quota and rate-limit table with validated
  defaults (455); T4 suspended accounts refused on association requests (460), amended by local review M1 so
  they can still sign in to "My account" for export, deletion and disputes (410); review M2
  counts sign-in failures per (account, IP) plus per IP (465); plus T3 use case ↔ module
  table, T5 operator bootstrap of the first super administrator, T6 removal keeps sessions,
  T8 public event ids allowed, T9 suspension derived at read. Open preconditions: #246
  migration, email provider, hosting/backups. Branch `docs/v1-traceability`.
- **V1 product framing** — owner validated the V1 framing (cultural associations, create,
  present and publish everywhere through a read-only partner API), personas and journeys
  J1–J6 ([framing](docs/architecture/specs/v1-product-framing.md),
  [journeys](docs/architecture/specs/v1-user-journeys.md)). Partner keys follow J6 D2:
  several named keys per association. Branch `docs/v1-product-framing`.
- **V1 use cases and domain model** — owner validated the use case diagram, 33 Cockburn
  fiches, class diagram, event/association state diagrams and four sequences with scored
  review tables (`docs/architecture/diagrams/v1-events/`). After the PR #266 review, only a
  verified email can become a member (UC11) and moderator conflicts include former members
  and the disputing party. Branch `docs/v1-use-cases`.
- **V1 component diagram** — owner validated
  [03-component](docs/architecture/diagrams/v1-events/03-component.md) with scored decisions
  CP1–CP5: in-process `runOnce` jobs, server-proxied address suggestions, neutral `FileStore`
  port, domain ports only at real boundaries, `EmailSender` inside the email delivery
  package. The local review aligned the scheduled job sequence (02d: internal timer, images
  deleted before data). Database (#246) and hosting stay undecided. Branch
  `docs/v1-component`, stacked on `docs/v1-use-cases`.
- **V1 data-flow diagram** — owner validated
  [06-data-flow](docs/architecture/diagrams/v1-events/06-data-flow.md): personal data
  inventory with GDPR legal basis and retention, flows leaving HappiHub, account deletion
  cascade. Decisions DF1 outbox deleted once sent (failures 30 days), DF2 unverified accounts
  deleted after 30 days (reminder day 23, new `Account.verificationReminderAt`), DF3
  ingress/error logs with IP kept 14 days, DF4 invitations deleted once not pending, DF5
  moderation records kept 12 months after closure. UC2/UC6 and 02d aligned after the local
  review. No consent-based processing in V1. Backups deferred to hosting. Branch `docs/v1-data-flow`.

## 2026-10-12

Session scope: repository recovery, security remediation and product framing.

- **Repository recovery and baseline** — resumed the existing HappiHub repository.
  Main baseline `e3e9007` was checked against GitHub main. Work remains on
  `fix/security-boundaries`; the local repairs are not merged, released or deployed.
- **Backlog reorganization** — consolidated superseded tasks, reopened incomplete test
  work and organized the remaining issues under the [HappiHub Project](https://github.com/users/benoit-bremaud/projects/6).
  [Framing epic #58](https://github.com/benoit-bremaud/HappiHub/issues/58) is the product
  framing entry point. The retained local audit snapshot records the approved cleanup;
  historical issue closure is not evidence that a feature exists today.
- **Collaboration decision** — repository access was retained for Benoît and Clément/Yazii
  after the authorized cleanup. Historical commit authorship was preserved. Private
  Project membership was not independently verified. See the dated
  [cleanup record](docs/architecture/backlog-audit-2026-10-12/completion.md) and
  [handover](docs/HANDOVER.md).
- **Local security recovery** — identity/visibility boundaries, client/API contract alignment
  and accurate API documentation were implemented and tested. Evidence:
  `f49e5cb`, `ef90ef4`, `a887f3b` and the dated [security report](docs/architecture/security-repair-2026-10-12.md).
- **Private configuration and dependency recovery** — removed tracked environment files
  while preserving private local copies, replaced unsafe examples and reduced manifests.
  Evidence: `c650f8b`, `310dca1`, [credential report](docs/architecture/credential-cleanup-2026-10-12.md)
  and [dependency report](docs/architecture/dependency-remediation-2026-10-12.md).
  History still contains earlier credential material; no deployment rotation or history rewrite was established.
- **Local container workflows** — separated local and production-baseline container setup,
  narrowed database access, pinned images and tested isolated synthetic stacks.
  Evidence: `a9dd4c8`, [Docker report](docs/architecture/docker-remediation-2026-10-12.md).
- **Server-managed sessions** — approved session conception and coordinated cookie/CSRF
  migration were implemented locally. Evidence: `45b5c15`, `c831c6b`,
  [ADR-0001](docs/architecture/decisions/0001-server-managed-cookie-sessions.md) and
  [session report](docs/architecture/session-migration-2026-10-12.md).
  Latest recorded checks: 86 fast server tests, 14 Mongo integration tests, 18 client
  tests and client build passed. Session persistence survived an API process restart.
- **Product direction decisions** — keep HappiHub; preserve its culture/sharing/community
  purpose; prioritize organizer management and event creation/editing/presentation;
  expose event capabilities to other websites through server-to-server API integrations.
  The wider combined product ambition is confirmed, but audience, detailed feature
  behavior, first-release boundary and final database choice remain unresolved.
- **Conception gate reinforced** — no further code implementation without complete,
  detailed UML/specification, reviewed for consistency and explicitly approved by Benoît.
  Idea/roadmap approval is distinct from approval to code. Record approved scope/version
  and revalidate affected design before continuing code when a gap is found.
- **Visual/demo requests recorded** — revisit site design with Clément, explore an original
  fun logo, approximately ten fictional public events plus restricted fixtures, and dedicated
  local test credentials. These remain requests/proposals, not implemented capabilities.
- **Work plan and continuity updated** — added the [prioritized plan](docs/WORK_PLAN.md),
  [handover](docs/HANDOVER.md), root [agent entry point](AGENTS.md) and current unreleased
  changelog notes. No application code or remote backlog state changed in this documentation step.

- **Roadmap backlog reconciliation and publication authorization** — owner requested issue/Project
  updates, commit/push and a restoration PR with Clement review. Audited all 121 open issues:
  retained 38, closed 83 superseded tasks as not_planned with replacement links and archived
  cards, created [#242–#256](https://github.com/benoit-bremaud/HappiHub/issues/242) for the new
  studies/delivery. Fresh verification: 53 open issues/cards, 38 Backlog and 15 In review,
  priorities P0–P3 and no obsolete dates. No new application code, merge or deployment.
  Evidence: [complete reconciliation](docs/architecture/roadmap-backlog-reconciliation-2026-10-12.md)
  and [publication review](docs/architecture/recovery-publication-review-2026-10-12.md).

- **[Recovery PR #257 opened](https://github.com/benoit-bremaud/HappiHub/pull/257)** — published the authorized
  fix/security-boundaries branch after full local review and fresh tests/build; requested
  clement-machtelinckx as reviewer, assigned Benoit and attached to HappiHub Project #6
  as In review/P1. The PR consolidates existing approved recovery work and the revised
  backlog/continuity documentation. It is open, not merged or released.

- **Architecture requirements reinforced** — owner requested folder architecture inspired
  by Clean, explicit anti-pattern review and no unjustified duplicated knowledge; deferred
  SonarQube configuration. Read-only audit found almost identical auth form CSS, repeated
  read lifecycles and legacy configuration/responsibility gaps. Recorded the findings and
  added responsibility/dependency/migration requirements to #41 and later quality-tooling
  studies #25/#248. No source movement, tooling installation or pipeline change.
  Evidence: [folder audit](docs/architecture/folder-architecture-audit-2026-10-12.md).

## Historical reconstruction through 2024-08-29

Verified on 2026-10-12 using GitHub merged-PR metadata and local Git ancestry.
All 51 returned merged PRs have a merge commit present in origin/main history.
Their titles describe recorded intent, not a guarantee of complete or correct behavior.
Historical review-round details were not reconstructed. Current contracts and audit reports
remain authoritative for runtime behavior. No GitHub tags or releases were returned.
The changelog's old 0.1.0 label is retained as an unverified historical version label.

### 2024-08-29

- **Main baseline update** (`e3e9007`) — Update README.md. Git ancestry and current GitHub
  main verify this commit; the direct-push versus integration route is not established by
  the inspected metadata. No administrator-bypass claim is inferred.

### 2024-07-30

- **[PR #234](https://github.com/benoit-bremaud/HappiHub/pull/234) merged** (`b204b53`) — test(signup-route): add unit tests for signup route. Branch `testing/219-unit-tests-signup-route` into `main`.
- **[PR #233](https://github.com/benoit-bremaud/HappiHub/pull/233) merged** (`2cd56d8`) — test(login-route): add unit tests for login route functionality. Branch `testing/220-unit-tests-login-route` into `main`.
### 2024-07-27

- **[PR #230](https://github.com/benoit-bremaud/HappiHub/pull/230) merged** (`023b6e1`) — feat(tests): Implement Unit Tests for /signup Route. Branch `testing/219-unit-tests-signup-route` into `main`.
- **[PR #225](https://github.com/benoit-bremaud/HappiHub/pull/225) merged** (`49531de`) — chore: Add dotenv package to client devDependencies and update server…. Branch `testing/218-configure-jest-supertest` into `main`.
### 2024-07-25

- **[PR #223](https://github.com/benoit-bremaud/HappiHub/pull/223) merged** (`5951693`) — BUKKAKKKEEEE. Branch `bukkake_branch` into `main`.
### 2024-07-24

- **[PR #214](https://github.com/benoit-bremaud/HappiHub/pull/214) merged** (`6d66edf`) — Sex branch2. Branch `sex_branch2` into `main`.
- **[PR #222](https://github.com/benoit-bremaud/HappiHub/pull/222) merged** (`a0d2792`) — Comments front. Branch `comments_front` into `main`.
### 2024-07-23

- **[PR #217](https://github.com/benoit-bremaud/HappiHub/pull/217) merged** (`fc2a7df`) — feat(docs): add comprehensive Express documentation guide. Branch `docs/guide-express` into `main`.
### 2024-07-22

- **[PR #213](https://github.com/benoit-bremaud/HappiHub/pull/213) merged** (`c784cbc`) — \`docs/211-joi-validation-documentation\`. Branch `docs/211-joi-validation-guide` into `main`.
### 2024-07-21

- **[PR #200](https://github.com/benoit-bremaud/HappiHub/pull/200) merged** (`cbe67fd`) — docs: update CONTRIBUTING.md with new naming conventions. Branch `32-docs-crer-le-guide-de-contribution-contributingmd` into `main`.
- **[PR #209](https://github.com/benoit-bremaud/HappiHub/pull/209) merged** (`77a4d34`) — feat: implement DELETE /comments/event/:eventId route to delete all c…. Branch `feature/delete-comments-by-event-id` into `main`.
### 2024-07-20

- **[PR #204](https://github.com/benoit-bremaud/HappiHub/pull/204) merged** (`223d641`) — \`feature/delete-comments-by-user-id\`. Branch `feature/delete-comments-by-user-id` into `main`.
- **[PR #199](https://github.com/benoit-bremaud/HappiHub/pull/199) merged** (`5641c61`) — \`feature/delete-comment-by-id\`. Branch `feature/delete-comment-by-id` into `main`.
- **[PR #196](https://github.com/benoit-bremaud/HappiHub/pull/196) merged** (`4981dcd`) — feat: implement PATCH /comments/:id route to partially update a comme…. Branch `feature/update-comment-by-id-patch` into `main`.
- **[PR #193](https://github.com/benoit-bremaud/HappiHub/pull/193) merged** (`52083c8`) — feat: implement GET /comments route for admins to retrieve all comments. Branch `feature/get-all-comments` into `main`.
- **[PR #188](https://github.com/benoit-bremaud/HappiHub/pull/188) merged** (`c71fc71`) — feat: implement PUT /comments/:id route with author verification. Branch `feature/update-comment-by-id-put` into `main`.
- **[PR #187](https://github.com/benoit-bremaud/HappiHub/pull/187) merged** (`0ebfbd3`) — feat: implement GET /comments/event/:eventId route to retrieve all co…. Branch `feature/get-comments-by-event-id` into `main`.
- **[PR #183](https://github.com/benoit-bremaud/HappiHub/pull/183) merged** (`44cd0fe`) — feat: implement GET /comments/user/:userId route to retrieve all comm…. Branch `feature/get-comments-by-user-id` into `main`.
- **[PR #182](https://github.com/benoit-bremaud/HappiHub/pull/182) merged** (`f9662c6`) — feat: implement GET /comments/:id route to retrieve a specific commen…. Branch `feature/get-comment-by-id` into `main`.
### 2024-07-19

- **[PR #177](https://github.com/benoit-bremaud/HappiHub/pull/177) merged** (`230137c`) — feat: add comment creation route with status, author, and event fields. Branch `feature/add-comment-status` into `main`.
- **[PR #173](https://github.com/benoit-bremaud/HappiHub/pull/173) merged** (`848104d`) — Yolo branch. Branch `yolo_branch` into `main`.
- **[PR #172](https://github.com/benoit-bremaud/HappiHub/pull/172) merged** (`1569810`) — Front end home. Branch `front_end_home` into `main`.
- **[PR #143](https://github.com/benoit-bremaud/HappiHub/pull/143) merged** (`4920acd`) — Add Comprehensive JWT Token Management Documentation. Branch `docs/add-jwt-token-management` into `main`.
- **[PR #138](https://github.com/benoit-bremaud/HappiHub/pull/138) merged** (`1b009cd`) — Fuck branch2. Branch `fuck_branch2` into `main`.
### 2024-07-18

- **[PR #137](https://github.com/benoit-bremaud/HappiHub/pull/137) merged** (`2fd8e36`) — chore: Remove logout route and validation. Branch `feature/user-logout-route` into `main`.
- **[PR #136](https://github.com/benoit-bremaud/HappiHub/pull/136) merged** (`69f63d4`) —  Implement Password Hashing for User Security. Branch `fix/hash-passwords` into `main`.
- **[PR #134](https://github.com/benoit-bremaud/HappiHub/pull/134) merged** (`8cb6083`) — CSS Connexion. Branch `CSS-register-login` into `main`.
- **[PR #133](https://github.com/benoit-bremaud/HappiHub/pull/133) merged** (`51e6f9f`) — add eventInfos. Branch `fuck_branch` into `main`.
- **[PR #132](https://github.com/benoit-bremaud/HappiHub/pull/132) merged** (`e8fbb95`) — add image to event. Branch `fuck_branch` into `main`.
- **[PR #131](https://github.com/benoit-bremaud/HappiHub/pull/131) merged** (`b99524c`) — add user id on event. Branch `fuck_branch` into `main`.
### 2024-07-17

- **[PR #125](https://github.com/benoit-bremaud/HappiHub/pull/125) merged** (`89e44e4`) — add redirect to home + securoty profile. Branch `fuck_branch` into `main`.
- **[PR #120](https://github.com/benoit-bremaud/HappiHub/pull/120) merged** (`1edcf2b`) — feat(users): add GET /api/users/:id endpoint to retrieve user informa…. Branch `feature/get-user-by-id` into `main`.
- **[PR #123](https://github.com/benoit-bremaud/HappiHub/pull/123) merged** (`0c859b4`) — add logic page. Branch `sercurity_front` into `main`.
- **[PR #117](https://github.com/benoit-bremaud/HappiHub/pull/117) merged** (`6de739d`) — Implement POST \`/api/comments/add\` Route. Branch `feature/add-comment` into `main`.
### 2024-07-16

- **[PR #110](https://github.com/benoit-bremaud/HappiHub/pull/110) merged** (`05ba4d8`) — feat(users): implement GET /api/users/role route. Branch `feature/get-user-role` into `main`.
### 2024-07-15

- **[PR #109](https://github.com/benoit-bremaud/HappiHub/pull/109) merged** (`166ee42`) — css correction + responsive card. Branch `profile_event` into `main`.
- **[PR #108](https://github.com/benoit-bremaud/HappiHub/pull/108) merged** (`e9dbfa5`) — Profile event. Branch `profile_event` into `main`.
- **[PR #107](https://github.com/benoit-bremaud/HappiHub/pull/107) merged** (`62646eb`) — Add Rank to User Profile. Branch `feature/user-roles` into `main`.
### 2024-07-12

- **[PR #90](https://github.com/benoit-bremaud/HappiHub/pull/90) merged** (`7144fdd`) — feat(events): create route to get all events. Branch `feature/get-events` into `main`.
- **[PR #89](https://github.com/benoit-bremaud/HappiHub/pull/89) merged** (`3532fcd`) — feat(events): add route to create new events. Branch `feature/create-event` into `main`.
- **[PR #88](https://github.com/benoit-bremaud/HappiHub/pull/88) merged** (`63559f4`) — feat(user-profile): Implement route to get user profile information. Branch `feature/get-user-profile` into `main`.
- **[PR #86](https://github.com/benoit-bremaud/HappiHub/pull/86) merged** (`8b1c658`) — feat(user-profile): implement PUT /api/users/profile route to update …. Branch `feature/update-user-profile` into `main`.
### 2024-07-10

- **[PR #85](https://github.com/benoit-bremaud/HappiHub/pull/85) merged** (`4c2b3d7`) — feat: Implement JWT authentication for user signup and login. Branch `feature/jwt-authentication` into `main`.
- **[PR #84](https://github.com/benoit-bremaud/HappiHub/pull/84) merged** (`b9efa5d`) — feat: Implement user login route. Branch `feature/docker-volumes` into `main`.
### 2024-07-09

- **[PR #81](https://github.com/benoit-bremaud/HappiHub/pull/81) merged** (`86d9fd0`) — feat: Implement user login route. Branch `feature/user-login` into `main`.
- **[PR #68](https://github.com/benoit-bremaud/HappiHub/pull/68) merged** (`a15de30`) — docs: Add CHANGELOG.md, CHANGELOG_GUIDE.md and update README.md. Branch `docs/changelog` into `main`.
- **[PR #79](https://github.com/benoit-bremaud/HappiHub/pull/79) merged** (`1326faf`) — docs: Create API_DOCUMENTATION.md and update README.md. Branch `docs/api-documentation` into `main`.
- **[PR #67](https://github.com/benoit-bremaud/HappiHub/pull/67) merged** (`aa2c297`) — docs: Add GUIDE.md and update README with link to guide. Branch `docs/guide` into `main`.
- **[PR #64](https://github.com/benoit-bremaud/HappiHub/pull/64) merged** (`046b5d5`) — docs: Add FAQ.md and update README with link to FAQ. Branch `docs/faq` into `main`.
- **[PR #80](https://github.com/benoit-bremaud/HappiHub/pull/80) merged** (`90d75a5`) — feature/user-signup. Branch `feature/user-signup` into `main`.
### 2024-07-08

- **[PR #63](https://github.com/benoit-bremaud/HappiHub/pull/63) merged** (`d337858`) — docs: Add SECURITY.md and update README with link to security policy. Branch `docs/security` into `main`.

### Initial ancestry and reconstruction limits

The merged-PR register covers the GitHub records returned through the current main
baseline. Other ancestral commits and non-PR branch merges remain available in Git
history; their authorship, push route and review status must not be inferred from a PR title.
This reconstruction does not certify every historical administrator action or review round.
Future substantive decisions and merges must be recorded with concrete evidence.
