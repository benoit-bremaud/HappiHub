# HappiHub V1 — data and migration study (#246)

Status: **D1–D3 decided by the owner on 2026-10-16** (section 7). Conception only: this
document authorizes no code, schema creation or data operation. It resolves precondition
T10 of the [implementation gate](v1-implementation-gate.md).

Baseline: `main` @ `d0e07df`. Inputs: [class diagram 04](../diagrams/v1-events/04-class.md),
[data-flow diagram 06](../diagrams/v1-events/06-data-flow.md),
[traceability T10](v1-traceability.md), [framing](v1-product-framing.md), legacy models in
`server/models/` (`userModel.js`, `eventModel.js`, `commentModel.js`), [ADR-0001](../decisions/0001-server-managed-cookie-sessions.md).

## 1. Need and fixed constraints

Choose the V1 database, derive its schema from the validated class model and decide what
happens to the legacy MongoDB data and features. Constraints already fixed by the owner:

- Zero budget: no paid database service or licence.
- EU hosting and GDPR: personal data (06) stays in the EU trust boundary; no new non-EU
  processor unless unavoidable and documented.
- One API process, in-process jobs (CP1), outbox worker (DF1), hosting still open (T11b).
- KISS/YAGNI: no second store unless a requirement needs it.

### Facts verified in the repository

| Fact | Evidence |
| --- | --- |
| No production deployment or release exists; only local/synthetic data | HANDOVER "No production release was performed"; no tags/releases on GitHub |
| Legacy `Event`: unique `title`, `status` pending/approved/rejected, `isPrivate`, `creator`, `attendees[]`, `comments[]`, free-text `location`, `image` string, no association | `server/models/eventModel.js` |
| Legacy `User`: `role` user/admin, `rank` (7 values), `permissions[]`, `authVersion`, bcrypt `password` | `server/models/userModel.js` |
| Legacy `Comment`: `content`, `user_id`, `event_id` | `server/models/commentModel.js` |
| Sessions stored by connect-mongo in the same Mongo database | ADR-0001 |
| V1 freezes participation and comments: "kept but not extended" | [framing](v1-product-framing.md) |

### Domain forces derived from 04 and 06

The V1 model is relational: every event belongs to exactly one association, membership is a
many-to-many with a "at least one member" rule, moderation targets three entity kinds, and
uniqueness (association `slug`, account `email`), bounded counts (≤ 5 API keys, ≤ 5
associations created per account) and optimistic versioning (`Event.version`) must hold.
Several use cases need atomic multi-record writes: account deletion cascade (F26), any
domain change plus its outbox email (F14, DF1), invitation acceptance (membership +
invitation deletion, F20a), moderation decision + suspension + case closure.

## 2. D1 — Database choice (MCDA)

### Options

- **A** — Keep MongoDB/Mongoose, self-hosted next to the API (single-node replica set for
  transactions).
- **B** — PostgreSQL, self-hosted next to the API on the EU host chosen under T11b.
- **C** — SQLite file embedded in the API process.
- **D** — Defer: keep the current Mongo baseline without a recorded decision.

Managed free tiers (MongoDB Atlas free cluster, Neon or Supabase for PostgreSQL) exist in
EU regions but are run by US companies with storage and backup limits; they are a hosting
variant, not a separate option, and are scored under criterion 3 as fallbacks only.

### Matrix (0 = blocking … 5 = ideal)

| # | Criterion | Weight | A MongoDB | B PostgreSQL | C SQLite | D Defer |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Integrity of the relational V1 model (FK, unique, check, counts) | 25 | **2**: no foreign keys; membership, ownership, cascades enforced only in code | **5**: FK, unique, CHECK, partial unique indexes, deferred constraints | **4**: FK (pragma on) and CHECK; weaker typing | **2**: same as A, plus legacy shape unchanged |
| 2 | Transactional consistency (outbox, cascade, versioning) | 15 | **3**: multi-document transactions need a replica set, even single-node | **5**: native ACID transactions, row locks | **4**: ACID, single writer serializes jobs and requests | **2**: as A but not designed |
| 3 | Zero budget, EU hosting, GDPR | 15 | **4**: open source self-host; managed fallback is US-run | **5**: open source self-host on any EU host; several EU managed fallbacks | **5**: no service at all | **4**: as A |
| 4 | Rewrite cost from the current code | 15 | **4**: keeps Mongoose and connect-mongo; models still reshaped for V1 | **2**: new data access layer, session store and test harness; no production data to move | **2**: same as B plus native driver build | **5**: nothing now |
| 5 | Operations and backups (T11b) | 15 | **3**: replica-set setup, `mongodump` | **4**: one service, `pg_dump`, mature tooling | **5**: one file, online backup command | **3**: as A |
| 6 | Maturity, ecosystem, skills (estimate) | 10 | **4**: current team baseline | **5**: most widespread relational database, broad Node support | **3**: single-host only; blocks a second API instance | **4**: as A |
| 7 | Reversibility | 5 | **3**: document shapes leak into code | **4**: standard SQL keeps exits open | **3**: SQL dialect close to Postgres, but single-host design | **5**: nothing decided |
| | **Σ weights** | **100** | | | | |

### Points (score × weight)

| Criterion (weight) | A | B | C | D |
| --- | --- | --- | --- | --- |
| 1 (25) | 50 | 125 | 100 | 50 |
| 2 (15) | 45 | 75 | 60 | 30 |
| 3 (15) | 60 | 75 | 75 | 60 |
| 4 (15) | 60 | 30 | 30 | 75 |
| 5 (15) | 45 | 60 | 75 | 45 |
| 6 (10) | 40 | 50 | 30 | 40 |
| 7 (5) | 15 | 20 | 15 | 25 |
| **Total / 500** | 315 | **435** 🏆 | 385 | 325 |

### Reading

- Margin: B leads C by 50 and A by 120. B vs C: equal on budget, C wins on operations, B
  wins on integrity, concurrency and the possibility of a second API instance. B vs A: A is
  cheaper today (rewrite), but the V1 model is reshaped anyway and A leaves integrity to code.
- Sensitivity: doubling rewrite cost (criterion 4 → 30, integrity → 10) gives B 390, D 370, C 355,
  A 345: B stays first.
- Estimates: criterion 6 (skills) and the managed free-tier limits are not measured. No
  estimate can flip B, since B leads on the two heaviest verified criteria.
- **Recommendation: B, PostgreSQL**, self-hosted in the EU next to the API.
- **Fallback: C, SQLite (385)** — second because it blocks a second API instance and has
  weaker typing; activation cost is low before brick D (same relational schema, dialect
  differences only), a design change after it.

## 3. Target schema (derived from 04-class and 06-data-flow)

Conventions: `snake_case` tables; `uuid` primary keys (public event ids allowed, T8);
`timestamptz` in UTC; enums as `text` + `CHECK` (simpler to extend than native enum types);
`[0..1]` attributes nullable, all others `NOT NULL`. Value objects `Venue`, `Price`,
`ModerationTarget` are embedded columns, not tables.

| Table | Columns (key constraints) | Source |
| --- | --- | --- |
| `account` | `id` PK, `email` UNIQUE (case-folded), `email_verified_at`, `verification_reminder_at`, `pending_email` (re-checked unique at confirmation), `password_hash`, `display_name`, `platform_role` CHECK (NONE, MODERATOR, SUPER_ADMIN), `auth_version`, `created_at`; partial index on `created_at` where `email_verified_at` IS NULL (F24) | Account, DF2 |
| `association` | `id` PK, `name`, `slug` UNIQUE, `city`, `presentation`, `website_url`, `contact_email`, `status` CHECK (ACTIVE, CLOSED), `closed_at`, `logo_image_id` FK image UNIQUE ON DELETE SET NULL, `created_by` FK account ON DELETE SET NULL, `created_at`; CHECK `status = 'CLOSED'` ⇔ `closed_at` set | Association, 05b |
| `membership` | PK (`account_id`, `association_id`), both FK ON DELETE CASCADE, `joined_at` | Membership |
| `invitation` | `id` PK, `association_id` FK CASCADE, `email`, `token_hash` UNIQUE, `expires_at`, `status` CHECK (InvitationStatus), `invited_by` FK SET NULL; partial UNIQUE (`association_id`, `email`) where `status = 'PENDING'`; index on `expires_at` (F20) | Invitation, DF4 |
| `event` | `id` PK, `association_id` FK CASCADE, `type` CHECK (8 values), `title`, `short_description`, `long_description`, `starts_at`, `ends_at` CHECK ≥ `starts_at`, `venue_label`, `venue_address`, `venue_normalized_city`, `price_kind` CHECK, `price_amount_cents` CHECK `(price_kind = 'AMOUNT') = (price_amount_cents IS NOT NULL AND price_amount_cents > 0)`, `poster_style`, `poster_image_id` FK image UNIQUE ON DELETE SET NULL, `status` CHECK (DRAFT, PUBLISHED, CANCELLED, ARCHIVED), `cancellation_reason`, `published_at`, `schedule_changed_at`, `hidden_by_moderation` default false, `cleanup_notice_at`, `version`, `created_by`/`last_edited_by` FK SET NULL, `updated_at`; **no unique index on `title`** | Event, 05a, 02a |
| `image` | `id` PK, `storage_key` UNIQUE, `mime_type`, `width`, `height`, `alt_text`; owned through `event.poster_image_id` / `association.logo_image_id`; files and rows are deleted by the use case or job before the owner (F21) | Image |
| `api_key` | `id` PK, `association_id` FK CASCADE, `name`, `prefix` UNIQUE, `secret_hash`, `created_by` FK SET NULL, `created_at`, `last_used_at`, `revoked_at`, `revocation_notice_at` | ApiKey, I1 |
| `activity_entry` | `id` PK, `association_id` FK CASCADE, `actor_id` FK SET NULL, `action`, `target_ref`, `occurred_at`; index on `occurred_at` for the 12-month purge | ActivityEntry, F19 |
| `report` | `id` PK, `target_kind` CHECK (TargetKind), `target_id`, `reason` CHECK, `comment`, `reporter_email`, `status` CHECK (CaseStatus), `created_at`, `closed_by` FK moderation_decision; index (`target_kind`, `target_id`), index (`status`, `created_at`) (F19b) | Report |
| `moderation_decision` | `id` PK, `kind` CHECK (11 values), `target_kind` CHECK, `target_id`, `reason`, `decided_at`, `decided_by` FK SET NULL; index (`target_kind`, `target_id`), index `decided_at` | ModerationDecision, T1 |
| `suspension` | `id` PK, `target_kind` CHECK, `target_id`, `ends_at`, `lifted_at`, `issued_by` FK UNIQUE, `lifted_by` FK UNIQUE; index (`target_kind`, `target_id`) | Suspension, T9 |
| `removal_dispute` | `id` PK, `disputant_id` FK SET NULL (nullable), `association_id` FK SET NULL (nullable), `association_name`, `removed_at`, `explanation`, `status` CHECK, `resolution`, `resolved_by` FK SET NULL, `created_at` | RemovalDispute |
| `moderation_dispute` | `id` PK, `disputant_id` FK SET NULL (nullable), `decision_id` FK UNIQUE, `explanation`, `status` CHECK, `resolution`, `resolved_by` FK SET NULL, `created_at` | ModerationDispute |
| `auth_token` | `id` PK, `account_id` FK CASCADE, `purpose` CHECK (VERIFY, RESET), `token_hash` UNIQUE, `expires_at`; index `expires_at` | 06 D_TOK |
| `outbox_message` | `id` PK, `recipient`, `template`, `payload`, `created_at`, `attempts`, `failed_at`; row deleted once sent; `payload` (which holds the token link) cleared on final failure, index `failed_at` (F25) | 06 D_OUT, DF1 |
| `session` | session id PK, `data`, `expires_at` index; revocation by `account.auth_version` (ADR-0001), expired rows purged | 06 D_SES, ADR-0001 |

Rules kept in the domain, not in the schema (they span rows or depend on time): at least one
member per active association, ≤ 5 associations created per account, ≤ 5 active API keys,
quotas (T2), suspension derived at read (T9). They run inside the same transaction as the
write they guard, with a row lock on the owning association or account.

`ModerationTarget` stays polymorphic (`target_kind`, `target_id`) without a foreign key, as
in 04: moderation records must survive deletion of their target for the 12-month retention
(F19b). Moderation records and disputes reference accounts and associations with `SET NULL`, so
closing an association or deleting an account keeps them for their 12-month retention
(F19b, DF5); only that purge removes them. After deletion, `target_id` of a deleted account
remains a pseudonymous reference; 06 must list it as retained data.

Account deletion (F26) runs in one transaction: lock the account's associations, apply the
last-member rule of UC6 2a (close each such association, UC8), delete pending invitations to its email and
pending outbox rows to its address (no FK), then delete the account so memberships and
tokens cascade. Images are removed from file storage first (F21).

## 4. D2 — Legacy data strategy (MCDA)

No production data exists; the legacy database holds only local synthetic fixtures.

### Options

- **A** — Transform and import: script legacy users, events and comments into the V1 schema.
- **B** — Fresh start: create the V1 schema empty; archive a dump of any legacy database;
  the first super administrator comes from the operator bootstrap (T5); demo data comes
  from the pending dedicated fictional dataset.
- **C** — Import accounts only, drop events and comments.

| # | Criterion | Weight | A | B | C |
| --- | --- | --- | --- | --- | --- |
| 1 | Value of the migrated data | 30 | **1**: synthetic fixtures only | **4**: nothing of value lost; dump kept | **2**: synthetic accounts, all unverified |
| 2 | Fit to V1 rules | 25 | **1**: events lack association, venue, type; would violate 04 | **5**: every row is created by V1 use cases | **2**: unverified accounts are deleted after 30 days anyway (DF2) |
| 3 | Effort and risk | 25 | **1**: mapping, script, tests, rollback | **5**: no script | **3**: small script |
| 4 | GDPR minimization | 20 | **2**: carries data without V1 consent text | **5**: nothing carried | **3**: emails carried |
| | **Σ weights** | **100** | | | |

Points: A 30 + 25 + 25 + 40 = **120**; B 120 + 125 + 125 + 100 = **470** 🏆; C 60 + 50 + 75 + 60 = **245**.

Sensitivity: B scores highest or equal on every criterion, so no weight change can displace it. Recommendation: **B, fresh start**. Fallback C (245) only if real users
appear before V1 ships; it would then need its own consent and mapping study.

### Legacy item disposition (applies to B; documents why nothing maps)

| Legacy item | V1 counterpart | Disposition |
| --- | --- | --- |
| `Event.status` pending/approved/rejected | `status` DRAFT/PUBLISHED/… + `hidden_by_moderation` (05a) | Not mapped: V1 has no prior approval. Code paths filtering on `approved` retire with the legacy event routes |
| Unique index on `Event.title` | None (homonymous events allowed) | Not recreated; the Mongo index disappears with the legacy store |
| Events without association (`creator` only) | `event.association_id` NOT NULL | Not migratable by construction; archived in the dump |
| `isPrivate`, free-text `location`, `image` URL | Draft status, `Venue`, `Image` | Not mapped |
| `User.role` admin, `rank`, `permissions` | `platform_role` | Not mapped; ranks stay an unresolved V2 topic; first super admin by T5 |
| `authVersion`, bcrypt hash | `auth_version`, `password_hash` | Concept kept in the new schema; no values carried |
| `attendees[]`, `Comment` (frozen) | none in 04 | See D3 |

## 5. D3 — Frozen participation and comments

The framing keeps these features "not extended". With D1 = B, their Mongo storage no longer
exists, so "kept" needs a concrete form.

### Options

- **A** — Port as minimal frozen tables `event_participation (event_id, account_id)` and
  `event_comment (id, event_id, account_id, content, created_at)`, existing behavior only.
- **B** — Retire both features in V1 (amends the framing; restorable from git later).
- **C** — Keep a MongoDB instance only for them.

| # | Criterion | Weight | A | B | C |
| --- | --- | --- | --- | --- | --- |
| 1 | Respect of the validated framing ("kept") | 30 | **5**: kept as is | **1**: requires framing revalidation | **4**: kept, but on a second store |
| 2 | Simplicity / one store (KISS) | 25 | **4**: two small tables | **5**: nothing | **0**: second database to run and back up |
| 3 | GDPR surface (06 inventory) | 20 | **3**: adds comments and participant ids to the inventory, export and deletion cascade | **5**: smaller surface | **2**: same data, two stores |
| 4 | Effort | 15 | **3**: port routes and tests | **5**: delete routes and tests | **2**: dual connections |
| 5 | Reversibility | 10 | **4**: tables easy to drop | **3**: re-implementation needed later | **2**: hard to untangle |

Points: A 150 + 100 + 60 + 45 + 40 = **395** 🏆; B 30 + 125 + 100 + 75 + 30 = **360**;
C 120 + 0 + 40 + 30 + 20 = **210**.

Margin 35: sensitive. If GDPR surface is raised to 35 (framing 15), B wins (A 365, B 420). Recommendation: **A, port as frozen tables**,
because the framing is validated. Fallback B, which needs a framing amendment approved by
Benoît. If A is chosen, 06 must add both tables to the inventory (export F22, deletion F26,
never exposed in public projections) before the porting brick.

## 6. Consequences and follow-ups

- [ADR-0003](../decisions/0003-postgresql-primary-database.md) records the database decision.
- Diagram 06 must add `event_participation` and `event_comment` (D3) to the inventory, export
  (F22) and deletion cascade (F26) before the porting brick; that diagram change needs its
  own approval.
- ADR-0001 store detail changes: sessions move from connect-mongo to a PostgreSQL session
  table; the cookie, CSRF, lifetimes and revocation rules are unchanged.
- The data access library and the migration tool are chosen (MCDA) in the brick D
  conception, with Context7 verification, not here.
- Hosting T11b must provide PostgreSQL in the EU and nightly `pg_dump` backups; retention is
  decided with hosting.
- The disposable real-Mongo integration tests are replaced by disposable PostgreSQL tests
  in the first data brick; Docker docs change accordingly.
- Rollback: before brick D merges, revert to option C or A by a documentation change; after
  it, by restoring the archived Mongo dump on the legacy branch (no user data at risk).

## 7. Owner decision

| Date | D1 database | D2 legacy data | D3 frozen features | Notes |
| --- | --- | --- | --- | --- |
| 2026-10-16 | B PostgreSQL (435/500), fallback SQLite 385 | B fresh start (470/500), fallback accounts only 245 | A frozen tables (395/500), fallback retire 360 | Weights validated and top scores chosen by Benoît |
