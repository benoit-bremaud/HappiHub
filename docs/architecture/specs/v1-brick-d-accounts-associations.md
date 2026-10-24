# HappiHub V1 — brick D: accounts and associations foundation (UC1–UC8, UC10–UC12)

Status: **decided by the owner on 2026-10-16** (section 9), revised after the local review (S2, N1). Conception approved; implementation
of brick D may start on its own branch, within this specification.

Baseline: `main` @ `9df2379`. Inputs: [use cases](v1-use-cases.md) UC1–UC12,
[data and migration study](v1-data-migration.md) (schema, D1–D3),
[ADR-0003](../decisions/0003-postgresql-primary-database.md),
[ADR-0001](../decisions/0001-server-managed-cookie-sessions.md) and its
[specification](cookie-sessions.md), diagrams [04-class](../diagrams/v1-events/04-class.md),
[02b invite and join](../diagrams/v1-events/02b-sequence-invite-and-join.md),
[03-component](../diagrams/v1-events/03-component.md),
[06-data-flow](../diagrams/v1-events/06-data-flow.md),
[implementation gate](v1-implementation-gate.md).

## 1. Scope

Brick D is the first data brick of the sequence A (done) → **D** → B → C. It replaces the
Mongo account layer with PostgreSQL and delivers:

| In scope | Use cases |
| --- | --- |
| Account sign-up with first association, sign-in/out on PostgreSQL sessions | UC1, ADR-0001 |
| Email verification, reset, account update, export, deletion | UC2–UC6 |
| Association profile (text fields), closure | UC7, UC8 |
| Invitations, joining, removal and leaving | UC10–UC12 |
| Activity entries written by these use cases (read view is UC14, later) | 04 ActivityEntry |
| Outbox rows for every email of these use cases | DF1 |
| Maintenance job tasks for these tables: expire invitations (F20), day-23 reminder and day-30 deletion of never-verified accounts (F24, DF2), purge outbox failures > 30 days (F25), purge expired tokens, purge activity entries > 12 months (F19) | 02d, 06 |
| Client screens for these flows and the [API contract](../../API_DOCUMENTATION.md) update; legacy account routes and pages retire | AGENTS.md |
| Schema migration tooling and the disposable PostgreSQL test harness | ADR-0003 consequences |

Out of scope, proposed for owner confirmation (decision S1, section 9):

- **UC13 Dispute a removal** — needs `removal_dispute`; moves with UC9 to the administration
  brick. Until then the removal email carries no dispute link.
- **UC9 Dispute a moderation decision** — it needs `moderation_decision`, which only exists
  with the administration brick. Brick D creates no moderation table; UC9 moves to that brick.
- **Association logo (UC7)** — it needs the image pipeline (#62, F12/F13) built with event
  posters in brick B. Brick D ships the text fields; the logo is added with the pipeline.
- Outbox *delivery* to a real provider — blocked by **T11a** (section 6).
- Frozen participation and comment tables (D3) — ported by their own brick; brick D only
  records them in 06 (section 8) so the export and deletion contracts are stable.

## 2. L1 — Data access library (MCDA)

The server is CommonJS JavaScript (Express 4, Jest, no TypeScript build). Needs: parameterized
SQL, multi-statement transactions with `SELECT … FOR UPDATE` row locks (last-member rule, ≤ 5
associations, outbox in the same write), partial unique indexes and CHECK constraints from the
schema study, a session store on the same pool.

Options (Context7 checks on 2026-10-16):

- **A** — `pg` (node-postgres) with hand-written parameterized SQL in small per-aggregate
  repository modules. Verified: transactions are explicit `BEGIN/COMMIT/ROLLBACK` on one
  checked-out pool client, never `pool.query` (docs "Transactions").
- **B** — Kysely query builder over the same `pg` pool. Verified: `PostgresDialect({ pool })`,
  `db.transaction().execute()`. Its main value (compile-time typing) needs TypeScript, which
  the server does not use.
- **C** — Prisma ORM. Verified: partial unique indexes and `@@check` are recent (7.4 / Prisma 8,
  the latter still a release candidate with breaking changes such as removed `@db.*`); row
  locks need raw SQL.

| # | Criterion | Weight | A pg | B Kysely | C Prisma |
| --- | --- | --- | --- | --- | --- |
| 1 | Fidelity to the schema study (partial unique, CHECK, `FOR UPDATE`, transactions) | 25 | **5**: any SQL, explicit transactions | **5**: builder + `sql` escape hatch | **3**: locks in raw SQL; partial/check support new |
| 2 | Injection safety by construction | 20 | **4**: `$n` parameters; relies on rule + review that no SQL is concatenated | **5**: values always bound | **5**: values always bound |
| 3 | Simplicity, dependencies (KISS) | 20 | **5**: one dependency, already needed by the session store | **3**: adds a builder layer | **2**: schema DSL, code generation, engine/adapters |
| 4 | Testability against real PostgreSQL | 15 | **4**: plain SQL, disposable database | **4**: same | **3**: generated client, migrate reset flow |
| 5 | Maturity and API stability | 10 | **5**: de facto Node driver for 10+ years | **4**: stable 0.x | **3**: major transition 7 → 8 in progress |
| 6 | Fit with the CommonJS JavaScript server | 10 | **5**: no build step | **3**: typing benefit lost without TS | **2**: TS-first toolchain |
| | **Σ weights** | **100** | | | |

| Points | A | B | C |
| --- | --- | --- | --- |
| 1 (25) | 125 | 125 | 75 |
| 2 (20) | 80 | 100 | 100 |
| 3 (20) | 100 | 60 | 40 |
| 4 (15) | 60 | 60 | 45 |
| 5 (10) | 50 | 40 | 30 |
| 6 (10) | 50 | 30 | 20 |
| **Total / 500** | **465** 🏆 | 415 | 310 |

- B vs A: B is safer by construction on injection, A is simpler and the server has no
  TypeScript to exploit B's typing. A's injection risk is mitigated by a review rule (every
  query text is a constant; values only through `$n`) and a test asserting it.
- Sensitivity: injection safety raised to 35 (simplicity 5): A 450, B 445 — A still first but
  by 5. A TypeScript server alone does not flip the result (B gains at most 20 points on
  criterion 6, A loses about 10); B overtakes only with both a TypeScript switch and the
  raised injection weight — revisit L1 if both happen. Estimates: criterion 4 and 5 are judgment, not measured.
- **Recommendation: A, `pg`.** Fallback B (415), adoptable later module by module on the same pool.

## 3. L2 — Schema migration tool (MCDA)

Options (Context7 checks on 2026-10-16):

- **A** — `node-pg-migrate`: PostgreSQL-only, migrations in SQL or JS, history table,
  advisory lock against concurrent runs, each migration in its own transaction, programmatic
  `runner()` usable from tests.
- **B** — Kysely `Migrator`: database lock, one transaction per migration on PostgreSQL; requires
  Kysely as a dependency.
- **C** — Graphile Migrate: SQL, roll-forward only, `current.sql` iteration workflow.
- **D** — Hand-written runner over numbered SQL files.

| # | Criterion | Weight | A node-pg-migrate | B Kysely Migrator | C Graphile Migrate | D Custom |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Reviewable plain-SQL migrations | 25 | **5**: SQL files supported | **3**: builder or raw `sql` | **5**: SQL | **5**: SQL |
| 2 | Safe concurrent/partial runs (lock, transaction) | 20 | **5**: advisory lock, per-migration transaction | **5**: lock, transaction | **4**: transactional, opinionated flow | **2**: to be written and tested |
| 3 | Simplicity, dependencies | 20 | **4**: one dev/runtime dependency | **2**: pulls Kysely just for migrations (L1 = A) | **3**: own workflow to learn | **3**: no dependency, more own code |
| 4 | Development and rollback flow | 15 | **4**: up/down, programmatic runner for tests | **4**: up/down | **2**: roll-forward only | **2**: minimal |
| 5 | Maturity | 10 | **5**: long-lived, PostgreSQL-dedicated | **4** | **4** | **1** |
| 6 | Fit with L1 | 10 | **5**: uses `pg` | **2**: second access layer | **4**: independent | **5** |
| | **Σ weights** | **100** | | | | |

Points: A 125 + 100 + 80 + 60 + 50 + 50 = **465** 🏆; B 75 + 100 + 40 + 60 + 40 + 20 = **335**;
C 125 + 80 + 60 + 30 + 40 + 40 = **375**; D 125 + 40 + 60 + 30 + 10 + 50 = **315**.

- A leads on every criterion or ties; no weight change displaces it unless L1 becomes B
  (then B's criteria 3 and 6 rise to 4/5 and B reaches 405, still below A).
- **Recommendation: A, `node-pg-migrate`**, SQL migration files, history table
  `pgmigrations`, run as an explicit operator step before the API starts (never implicitly
  at boot). Fallback C.

Session store (ADR-0001 store change, no alternative scored): `connect-pg-simple` on the same
`pg` pool, `createTableIfMissing: false` (the `session` table is created by a migration),
expired rows pruned by its built-in interval. Its idle expiry is the store `expire`; the 8 h
absolute cap stays a check in code (ADR-0001). The table has no account column, so revocation
at deletion, reset or suspension relies on the `auth_version` check, as today. Its default `sess json` / `expire` layout replaces
the generic `data` / `expires_at` names of the schema study. Cookie, CSRF, lifetimes and
`auth_version` revocation are unchanged.

## 4. Data model delivered by brick D

From the schema study § 3, only these tables are created by brick D's migrations:
`account`, `association`, `membership`, `invitation`, `auth_token`, `outbox_message`,
`activity_entry`, `session`. Columns and constraints are exactly those of the study, with
these precisions:

- `account.email` stored case-folded; uniqueness via `UNIQUE` on the folded value.
  `pending_email` is re-checked against `account.email` inside the confirming transaction.
- `association.logo_image_id` is added by the image brick (S1), not here.
- `association.slug`: lowercase ASCII from the name, `-n` suffix on collision (UC1 4b);
  never changed on rename (UC7 2a); reserved while CLOSED (UC8).
- ≤ 5 associations created per account (M1, "5 in total", S2): counted by a new
  `account.associations_created` integer incremented in the creating transaction, because
  closed associations are purged after 30 days and `created_by` alone would let a
  create-then-close cycle bypass the cap.
- `invitation`: accepted and revoked rows are deleted at once (DF4) and expired rows by the
  hourly job (F20); between expiry and the job, reads treat `expires_at < now()` as expired
  (accept answers 410, a new invitation to the same email replaces the expired row).
- `activity_entry.target_ref` holds an internal id or the association slug, never an email
  or a token (DF4: the invitee email is not kept).
- `outbox_message.template` is a closed list (section 6); `payload` holds the token link.

Domain rules enforced in the write transaction (locks on the association or account row):
last-member rule (UC12 1a, UC6 2a), ≤ 5 associations created (UC1 1b), invitation quota 10
per association per day (UC10 2a), last super administrator (UC6 2c).

## 5. Use-case realization

All writes use CSRF and exact-origin checks (ADR-0001). "Neutral" means the same status code,
body and comparable timing whether or not an account exists. Every association-scoped request
re-checks membership in the database (06, M1/T6). Rate limits use the existing process-local
limiter (one API instance).

| UC | Endpoint (proposed) | Transaction content |
| --- | --- | --- |
| UC1 | `POST /api/signup` {email, password, associationName}; signed in: `POST /api/associations` {name} | account + association + membership + verify token + outbox(VERIFY) + activity, **no session**; existing email: dummy bcrypt then outbox(ACCOUNT_EXISTS) only. Both answer the same 202 "check your inbox" without cookie (decision N1) |
| sign-in/out | `POST /api/session`, `DELETE /api/session` | session regenerate / destroy (ADR-0001) |
| invitation lookup | link opens the client page `/invitations#<token>` (fragment never sent to the server or logged); the page calls `POST /api/invitations/lookup` {token} | read only |
| UC2 | `POST /api/email-verification` {token}; `POST /api/email-verification/resend` | set `email_verified_at` (or promote `pending_email`), delete token; no session is opened (S1-C): the user then signs in; pending invitations for the email are listed after sign-in (UC11 4c) |
| UC3 | `POST /api/password-reset` {email}; `POST /api/password-reset/confirm` {token, password} | reset token + outbox; confirm: new hash, `auth_version`+1, delete token, new session |
| UC4 | `PATCH /api/account` | display name; email → `pending_email` + verify token + outbox to new and notice to old; password → hash + `auth_version`+1 keeping the current session |
| UC5 | `GET /api/account/export` | read-only JSON: account, memberships, invitations sent, activity entries as actor (events added by brick B, participation/comments by their brick) |
| UC6 | `DELETE /api/account` {password, confirm} | schema study § 3 account deletion order; refused for the last SUPER_ADMIN |
| UC7 | `PATCH /api/associations/{slug}` | name, city, presentation, website URL, contact email + activity |
| UC8 | `POST /api/associations/{slug}/close` | status CLOSED, `closed_at`, activity; event cancellation and key revocation hooks are no-ops until bricks B/C add those tables |
| UC10 | `POST/GET /api/associations/{slug}/invitations`, `DELETE …/{id}`, `POST …/{id}/resend` | per 02b: invitation + activity + outbox; revoke deletes the row (DF4) |
| UC11 | `POST /api/invitations/accept` {token} | per 02b (paths updated here: tokens move from the URL path to the body so access logs never hold them): membership + delete invitation + activity, only with matching verified email |
| UC12 | `DELETE /api/associations/{slug}/members/{accountId}`, `POST …/leave` | delete membership + activity + outbox(`MEMBER_REMOVED`, no dispute link until UC13 ships) |

Tokens (verify 24 h, reset 1 h, invitation 7 days): 32 random bytes, base64url in the link
fragment, SHA-256 stored, single use, compared by hash lookup; sent to the API only in request
bodies; pages served with `Referrer-Policy: no-referrer`; never logged (DF3). Password hashing stays bcrypt (A2: 15–64 characters, ≤ 72 bytes, local
blocklist).

## 6. Email and the T11a dependency

Brick D writes every email as an `outbox_message` row (templates: `VERIFY`, `VERIFY_REMINDER`,
`ACCOUNT_EXISTS`, `RESET`, `EMAIL_CHANGE_NOTICE`, `INVITATION`, `MEMBER_REMOVED`). The outbox
worker reads rows through a **transport port** with one implementation in brick D:

- `log` transport (development and tests only): marks the row sent and writes the link to the
  local console, then deletes the row (DF1: deleted once sent). Refused at start-up when `NODE_ENV=production`.

T11a (EU email provider) remains open and **blocks any deployment** of sign-up, not the
brick's merge: without a real transport, UC1–UC3, UC10 cannot reach users. The provider
adapter is a separate small change once T11a is decided.

## 7. Acceptance criteria

Each criterion maps to at least one automated test (section 8).

| # | Criterion | UC |
| --- | --- | --- |
| AC1 | Sign-up creates account, association (readable unique slug) and membership in one transaction; a failure leaves none of them | UC1 |
| AC2 | Sign-up with an existing email returns the same status, body and headers (no `Set-Cookie`) as a new one, within a comparable time (dummy bcrypt), and only queues `ACCOUNT_EXISTS`; sign-in is refused with the neutral 401 until the email is verified | UC1 4a, N1, S1-C |
| AC3 | An account cannot create a 6th association, even after closing earlier ones | UC1 1b |
| AC4 | Verification token works once within 24 h; expired, reused or unknown tokens change nothing | UC2 |
| AC5 | Reset answers neutrally; confirm replaces the hash, increments `auth_version`, invalidates every other session | UC3 |
| AC6 | Email or password change requires the current password; a new email is pending until verified and cannot take an existing account's email | UC4 |
| AC7 | Export contains only the requester's data | UC5 |
| AC8 | Deletion requires password and confirmation; closes associations where the account was last member; deletes pending invitations and outbox rows to its email; keeps activity entries with `actor_id` NULL; refused for the last super admin | UC6 |
| AC9 | Profile edit keeps the slug; change is logged | UC7 |
| AC10 | Closure refused while other members remain; afterwards the slug stays reserved | UC8 |
| AC11 | Invitation requires a verified inviter, refuses existing members, enforces 10/day; revoke stops the link at once and deletes the row | UC10 |
| AC12 | Unknown, expired, revoked or used tokens all answer the same 410 (UC11 2a); accept admits only the invited email once verified; unverified gets 202 and no membership; different email gets 403 with a masked hint; the invitation row is deleted on success | UC11 |
| AC13 | Removing or leaving never leaves zero members; a removed member loses association access on the next request without session revocation | UC12 |
| AC14 | Sessions live in PostgreSQL with 30 min idle / 8 h absolute; logout deletes the row; a store outage fails closed | ADR-0001 |
| AC15 | No query text is built by string concatenation with input; tokens and passwords never appear in logs | security |
| AC16 | Migrations apply from empty to latest and down to empty on a disposable database | L2 |
| AC17 | Every limit of the [quotas table](v1-use-cases.md) that applies to UC1–UC12 answers 429 with `Retry-After`; the per-recipient email cap answers neutrally and sends nothing | T2 |
| AC18 | No token appears in ingress or API logs; invitation, verify and reset links carry the token in the fragment | DF3 |
| AC19 | The maintenance job expires invitations, reminds at day 23 and deletes never-verified accounts at day 30 with UC6 effects, purges outbox failures > 30 days, expired tokens and activity entries > 12 months (amended by [#328](maintenance-unverified-race.md): per-row recheck under lock) | F19–F25 |

## 8. Test plan

Pyramid, mocking only boundaries (clock, randomness, outbox transport):

- **Unit (many, Jest, no database)**: password policy A2, slug generation and suffixing,
  email folding and masking, token generation/hash, neutral-response builder, domain guards
  (last member, ≤ 5, quota) on in-memory inputs.
- **Integration (per use case, real PostgreSQL)**: disposable PostgreSQL started for the
  `test:integration` script (Docker image pinned per `docker-hardening`), schema built by
  `node-pg-migrate` `runner()`, each test in a fresh database or truncated tables; Supertest
  against the Express app for AC1–AC14; a concurrency test running two parallel accepts / two
  parallel leaves to prove the row locks (AC12, AC13). `mongodb-memory-server` is removed with
  the Mongo account code.
- **Migration test**: up to latest, down to zero, up again (AC16).
- **Static check**: a test scanning repository modules for template literals or `+` inside
  query text (AC15).
- **E2E (very few)**: sign-up → verify via log transport → invite → accept, in the browser,
  as the QA pass of the pre-merge gate.
- Coverage target ≥ 80 % on new modules (owner gate).

Legacy Mongo account routes are removed in the same brick and legacy event routes are
disabled (S3); MongoDB leaves the runtime with brick D.

## 9. Owner decisions

| # | Decision | Recommendation | Fallback |
| --- | --- | --- | --- |
| L1 | Data access library | A `pg` (465/500) | B Kysely (415) |
| L2 | Migration tool | A `node-pg-migrate` (465/500) | C Graphile Migrate (375) |
| S1 | Scope: UC9 moved to the administration brick; association logo moved to the image brick | Accept | Keep in D (adds moderation and image tables early) |
| S2 | ≤ 5 associations per account | Initially ACTIVE only (240/500 after review); **revised: 5 in total as validated (440)** | — |
| N1 | Non-disclosing sign-up (review Must) | Verify first: same 202 for all, the verification link signs in and opens UC15 (335/500) | Immediate sign-in with accepted residual disclosure (330) |
| S3 | Legacy event routes during the D → B gap | Disable legacy event routes in D (fresh start, D2) | Keep them on Mongo until B (two stores temporarily) |
| S1-C | Pre-registration takeover found by the local review: an attacker signs up with the victim's email; the auto sign-in on verification hands the victim an attacker-known password | C: verification opens no session and sign-in is refused until the email is verified; a password reset also verifies the email (415/500) | B: password asked after verification (400); A: keep auto sign-in, bump auth_version (370) |
| 06 | Data-flow update for D3 tables and pseudonymous references (section 10) | Approve | — |

| Date | L1 | L2 | S1 | S2 | S3 | 06 | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-10-16 | A `pg` (465) | A `node-pg-migrate` (465) | Accepted | Accepted | Legacy event routes disabled in D | Approved | Weights validated and top scores chosen by Benoît |
| 2026-10-16 (review) | | | | Revised: 5 in total (440) | | | N1 verify first (335); both chosen by Benoît after the local review |
| 2026-10-16 (implementation review) | | | | | | | S1-C chosen by Benoît (415); supersedes the "verification signs in" part of N1 |

## 10. Diagram changes in this brick

[06-data-flow](../diagrams/v1-events/06-data-flow.md) adds the frozen `event_participation` and
`event_comment` tables (D3) to the inventory, export (F22) and deletion cascade (F26), and
records that moderation records keep the deleted account's `target_id` as a pseudonymous
reference until DF5 purges them. [02b](../diagrams/v1-events/02b-sequence-invite-and-join.md)
keeps its flow; its endpoint paths are superseded by section 5 (token in the body). Diagrams
04 and 03 need no change.

## 11. Implementation amendments (validated 2026-10-16)

Gaps found while implementing brick D. Benoît validated the "Implemented" column on
2026-10-16.

| # | Gap | Implemented | Alternative |
| --- | --- | --- | --- |
| A-D1 | UC11 3a needs an invitee sign-up, but `POST /signup` required an association name | `associationName` optional; without it no association is created. Client hides the field when coming from an invitation | Separate `/signup/invitee` endpoint |
| A-D2 | UC11 4c "Join" after verification has no token to send | `POST /invitations/accept` also takes `{invitationId}`, valid only for the same signed-in, verified invited address | Re-send each invitation email and require the link |
| A-D3 | AC17 says every quota answers 429 + Retry-After; the 5-association cap is permanent | `409` for the 5-in-total cap (no retry time exists) | `429` without `Retry-After` |
| A-D4 | Closed associations are kept forever (slug reserved) | Maintenance deletes closed associations 30 days after closing (UC8 notice); the slug becomes free again | Keep closed rows indefinitely |
| A-D5 | Members see each other's email in the member list | Kept (needed to identify co-organizers) | Display names only |

Follow-ups outside brick D: a real password blocklist (current list is a short placeholder),
running `npm run test:integration` in CI (`quality-tests.yml` needs owner authorization), a
least-privilege PostgreSQL application role, and the T11a email transport (production start is
refused until then).
