# Test environment — demo seed, test accounts and persona scenarios (#251)

Status: **validated by Benoît on 2026-10-24** (D1–D6 top scores, weights accepted). This
validates the conception only; implementation follows in its own brick (AGENTS.md gate).

UML: [diagrams/test-environment/](../diagrams/test-environment/).
Related: [personas](v1-personas.md), [use cases](v1-use-cases.md),
[brick B](v1-brick-b-event-lifecycle.md), [brick D](v1-brick-d-accounts-associations.md),
[ADR-0004 encryption at rest](../decisions/0004-encrypt-sensitive-data-at-rest.md),
[server tests](../../../server/tests/README.md), issues #251, #307, #295.

## 1. Goal and scope

The owner wants a complete test environment: databases filled with many kinds of data,
valid and invalid, and sign-in credentials with good and bad passwords, to test everything
thoroughly, by hand in the browser and automatically.

In scope:

- a **demo seed** for the local DEV database: personas, associations, about ten public events
  and private/draft/cancelled/archived fixtures;
- **test accounts** that sign in through the normal authentication flow;
- a **rejection catalogue**: invalid inputs and bad credentials, each with its expected
  answer, run by the integration suite and listed for manual QA;
- reset and idempotency rules; encryption at rest; the link to the CI gaps #307 and #295.

Out of scope: original cover illustrations and the logo (separate design work, Clément's
review pending), staging/production data, load testing, a browser E2E suite (§ 9).

## 2. Environment tiers

The server already resolves a tier suffix from `NODE_ENV` (`config/appConfig.js`):
`DEV` (default), `TEST` (`NODE_ENV=test`), `PROD` (`NODE_ENV=production`), and reads
`DATABASE_URL_<suffix>` and `FIELD_KEYRING_FILE_<suffix>`.

| Tier | Database | Data | Who writes it |
| --- | --- | --- | --- |
| TEST | disposable container from `tests/integration/globalSetup.js` | per-test fixtures, truncated by `resetData` | integration tests only |
| DEV (demo) | local PostgreSQL database whose name ends in `_demo` | demo seed (§ 4) plus whatever the developer adds | `npm run seed:demo` (proposed) |
| PROD | real hosting (not yet deployed) | real users | never seeded |

Decision **D5** (target guard), option A: the seed runs in the DEV tier only. It refuses to
start unless all of these hold, and exits non-zero with a message otherwise:

1. `NODE_ENV` is unset or `development` (never `production` or `test`);
2. the database name in `DATABASE_URL_DEV` ends in `_demo` (for example `happihub_demo`);
3. the host is loopback or a local Docker service name (no remote host);
4. `--confirm` is passed on the command line;
5. `DATABASE_URL_PROD` is not set, and the keyring path `FIELD_KEYRING_FILE_DEV` differs from
   `FIELD_KEYRING_FILE_PROD` when that variable is set.

Test fixtures stay where they are: the integration harness keeps its own container and
`resetData`; the seed never runs against it and the tests never depend on the seed.

## 3. Personas

The demo reuses the V1 personas ([v1-personas.md](v1-personas.md)) and adds the roles the
rules need. All addresses use the reserved `.test` top-level domain (RFC 2606), so no mail
can reach a real person, and this namespace marks every seeded row (§ 6).

| Key | Persona | Account state | Purpose |
| --- | --- | --- | --- |
| P1 | Claire, president of the troupe | verified, member of A1 | primary organizer: create, edit, publish |
| P2 | Malik, web volunteer | verified, member of A1 | second organizer of the same association, concurrent edits (`version`) |
| P3 | Sofia, organizer of another association | verified, member of A2 | ownership boundary: must not edit A1 events |
| P4 | Hugo, participant | verified, no association | signed-in visitor, participation when available |
| P5 | Nora, new signup | **unverified** | sign-in refused (401) until verified, resend-verification flow |
| P6 | Paul, pending email change | verified, `pending_email` set | email-change flow |
| P7 | Léa, moderator | verified, `platform_role = MODERATOR` | moderation visibility |
| P8 | Marc, quota reached | verified, `associations_created = 5` | association creation quota |
| — | Inès, visitor | no account | public pages only |

Emails follow `<first-name>@demo.happihub.test`; display names include accents and one
long name (edge cases, § 5).

## 4. Dataset matrix (valid data in the database)

The database can only hold valid states: its `CHECK` constraints and the domain reject the
rest. "Edge" rows are valid but sit at a limit.

### 4.1 Associations

| Key | Name | Status | Members | Notes |
| --- | --- | --- | --- | --- |
| A1 | Demo Tréteaux du Quartier (the V1 persona troupe) | ACTIVE | P1, P2 | main scenario |
| A2 | Demo Chorale du Canal (fictional) | ACTIVE | P3 | second owner |
| A3 | Demo Atelier fermé (fictional) | CLOSED, `closed_at` set | — | closed-association handling |
| A4 | Demo Marc 1 … Demo Marc 5, created by P8 | ACTIVE | P8 | quota edge (five created) |

Plus one PENDING invitation from A1 to P4, one EXPIRED and one REVOKED invitation.

### 4.2 Events

| Key | Association | Status | Type | Edge case covered |
| --- | --- | --- | --- | --- |
| E1–E10 | A1 / A2 | PUBLISHED, future | all eight types | the ten public demo events; prices FREE, AMOUNT, PAY_WHAT_YOU_WANT; all six poster styles |
| E11 | A1 | PUBLISHED | THEATRE | title of exactly 120 characters, short description of 280, long description near 10 000 |
| E12 | A1 | PUBLISHED | CONCERT | started more than 24 h ago, no `ends_at` (effective end = `starts_at` + 24 h) |
| E13 | A1 | PUBLISHED | DANCE | `ends_at = starts_at` (zero duration) |
| E14 | A2 | PUBLISHED | EXHIBITION | Corsican INSEE commune code `2A004` (Ajaccio), accented venue |
| E15 | A1 | DRAFT | WORKSHOP | minimal draft (title only), invisible to the public |
| E16 | A1 | DRAFT | TALK | old draft with `cleanup_notice_at` set |
| E17 | A1 | CANCELLED | CINEMA | `cancellation_reason` of 500 characters |
| E18 | A2 | ARCHIVED | OTHER | archived after its end |
| E19 | A1 | PUBLISHED | THEATRE | `hidden_by_moderation = true` |
| E20 | A1 | PUBLISHED | CONCERT | `schedule_changed_at` set, `version > 1`, edited by P2 |

Text fixtures include HTML/script-looking strings (`<script>alert(1)</script>`), emoji and
right-to-left characters, so the client's escaping can be checked by eye. Dates are computed
relative to the run date so "future" events stay future. Each association receives fewer
than 20 events per 24 h window (the `EVENT_QUOTA` limit of brick B), so a seed or reseed
never hits 429.

Decision **D6** (states the services cannot create directly), option A: E12, E17 and E18 are
created and published or cancelled with the seed's injectable clock (`ctx.now`) set in the
past, then E16 and E18 reach their state through `jobs/maintenance` run with that clock. E19
is the only documented direct-SQL exception (`hidden_by_moderation`), because moderation has
no API yet; it is replaced by the moderation service once that exists.

### 4.3 Supporting rows

Activity entries for A1 edits, one failed outbox message (`failed_at` set) and one pending
outbox message, all through the normal services so they are encrypted (§ 7).

## 5. Rejection catalogue (invalid data and bad credentials)

Decision **D4**, option A: invalid inputs are **requests**, not stored rows. Each case has an
identifier, an input and the expected HTTP status and error code. The integration suite runs
the catalogue against its disposable database; the same list is the manual QA checklist on
the demo database.

| Id | Area | Input | Expected |
| --- | --- | --- | --- |
| R-AUTH-1 | sign-in | known email, wrong password | 401, generic message (no account enumeration) |
| R-AUTH-2 | sign-in | unknown email | 401, same message and similar timing |
| R-AUTH-3 | sign-in | email with different case and spaces | accepted (`foldEmail`) |
| R-AUTH-4 | sign-in | 5 failures per (email, IP) or 20 per IP in 15 min | 429 |
| R-AUTH-5 | sign-in | empty or ≥ 1025-character password; body over 100 kB | 400; 413 |
| R-AUTH-6 | sign-in | unverified account (P5) | 401, same neutral message as R-AUTH-1 |
| R-AUTH-6b | verification | resend for P5 | 202 |
| R-AUTH-7 | session | write without CSRF token or with a foreign Origin | 403 |
| R-AUTH-8 | password change | wrong current password; 5 failures in 15 min | 403, no change; 429 |
| R-SIGN-1 | signup | existing email | same answer as a new signup, `ACCOUNT_EXISTS` email queued |
| R-SIGN-2 | signup | 14 characters; 65 characters or over 72 bytes; blocklisted password | 400 with `field` and `hint` |
| R-EVT-1 | events | title empty or 121 characters | 400 |
| R-EVT-2 | events | `ends_at` before `starts_at` | 400 |
| R-EVT-3 | events | publish a draft missing venue or city; start in the past | 422 `PUBLICATION_REFUSED` (`START_IN_PAST`) |
| R-EVT-4 | events | price AMOUNT with 0 or negative cents | 400 |
| R-EVT-5 | events | malformed city code `ABCDE`; well-formed code that is no commune | 400 `INVALID_FIELD` |
| R-EVT-6 | events | stale `version` on publish or cancel | 409 `STALE_VERSION` |
| R-EVT-6b | events | edit with a stale `base` value; edit without `base` | 409 `EDIT_CONFLICT`; 400 `BASE_REQUIRED` |
| R-EVT-7 | ownership | P3 edits an A1 event | 404 "Association not found", no data leak |
| R-EVT-8 | identity | body carries an author or association id | 400 `UNKNOWN_FIELD` |
| R-ASSO-1 | associations | P8 creates a sixth association | 409 |
| R-ASSO-2 | invitations | accept an expired, revoked or unknown invitation | 410 |
| R-PUB-1 | public API | draft, hidden or other-owner ids | 404, no owner identifiers in any projection |

The exact status codes are those of the current API contract
([API_DOCUMENTATION.md](../../API_DOCUMENTATION.md)); where it differs from this table, the
contract wins and the catalogue is corrected, not the API.

## 6. Test accounts and credentials

Decision **D2**, option A: the seed **generates** a random passphrase per account on each
machine (`crypto.randomBytes`, at least 20 characters), hashes it with the normal bcrypt cost,
and writes the clear passwords to `server/.demo-credentials.local.json`, file mode `0600`,
listed in `.gitignore`. The repository holds only the account list and
`server/.demo-credentials.example.json` with placeholders. Passwords never appear in logs,
commits, issues or chat.

- Rerunning the seed keeps an existing password if the file is present (testers keep their
  credentials), unless `--rotate-passwords` is given.
- "Bad password" scenarios need no stored secret: any other string is a bad password (R-AUTH-1).
- The integration suite keeps its synthetic constant `PASSWORD` in `harness.js`; it is a test
  value for a disposable database, not a credential.

Sensitivity: D2 is the closest decision (A 415 vs B 395); B wins if "ease for testers" weighs
10 points more than "secrets out of git". B would put fixed demo passwords in
`.env.example`: acceptable only because the accounts exist solely on local `_demo` databases.

## 7. Encryption at rest (ADR-0004)

The seed is a Node job that calls the same services as the API (decision **D1**, option A), so
every personal column goes through `fieldCipher` with the DEV keyring: AES-256-GCM envelopes,
blind indexes for email lookups, bcrypt password hashes. Apart from the E19 flag (D6), no SQL writes data; no SQL file writes clear personal
data, and no envelope is precomputed in git (it would bind the repository to one key).

- The DEV keyring is generated with `npm run keyring:generate`; losing it only loses demo data:
  rerun the seed on a fresh `_demo` database.
- Public event content stays clear, as in production.
- A seed check after the run reads one account back through the service and verifies that its
  stored email is an `hh1.` envelope (no clear address in the table).

## 8. Reset and idempotency

Decision **D3**, option A: every seeded row has a **natural key** inside the reserved namespace:
account email blind index for `@demo.happihub.test`, association name prefixed `Demo ` (slugs are
derived by `slugify`, so they start with `demo-`), event
identified by (association, title) of the seed definition. A run:

1. checks the guard (§ 2) and the migrations level;
2. upserts accounts, associations, memberships, invitations and events in dependency order,
   in one transaction per persona block;
3. never updates or deletes rows outside the namespace (unrelated developer data is kept);
4. `--reset` deletes only namespace rows (cascade through foreign keys) before reseeding.

Running twice yields the same row counts; the second run reports "0 created, N unchanged".

## 9. Link to the CI gaps #307 and #295

- **#307** (integration branch coverage below 80 %): the rejection catalogue (§ 5) is written as
  table-driven integration tests; most of its cases exercise error branches that are not yet
  covered, which is the cheapest route to the 80 % branch target. The seed job itself gets unit
  tests for the guard (each refusal of § 2) and an integration test for idempotency (§ 8).
- **#295** (code/config leftovers): any obsolete seed or demo script found during the work is
  removed in the #295 change, not mixed into the seed; the seed adds one npm script
  (`seed:demo`) and one ignored file, nothing else.
- A browser E2E suite (Playwright) is deferred: option C of D4 scored 310/500; it can reuse the
  demo dataset later.

## 10. Decisions (MCDA)

Scores 0–5, weights /100, totals /500. Sensitivity: every weight pair shifted by ±5 and ±10
points, computed with a script; "kept" counts the shifts where the winner stays first.

### D1 — seed mechanism

| Criterion (weight) | A Node job via services | B raw SQL file | C HTTP client on running API |
| --- | --- | --- | --- |
| Security / prod refusal (25) | 5 guard in code | 3 relies on psql target | 4 needs a running server |
| Fidelity to real rules (30) | 5 encryption, bcrypt, invariants | 1 cannot encrypt without keys | 5 full stack |
| Simplicity (20) | 3 | 5 | 2 sessions, CSRF, rate limits |
| Speed / reliability (15) | 4 | 5 | 2 rate limits on signup |
| Maintenance with schema (10) | 4 | 1 | 4 |
| **Total** | **435** | 290 | 360 |

Sensitivity: kept 40/40.

### D2 — credentials

| Criterion (weight) | A generated, ignored 0600 file | B fixed in `.env.example` | C owner sets each in env |
| --- | --- | --- | --- |
| Secrets out of git (35) | 5 | 2 | 5 |
| Ease for testers (25) | 4 | 5 | 2 |
| Reproducibility (20) | 3 | 5 | 4 |
| Simplicity (20) | 4 | 5 | 3 |
| **Total** | **415** | 395 | 365 |

Sensitivity: kept 20/24 (closest decision, see § 6).

### D3 — reset and idempotency

| Criterion (weight) | A upsert in reserved namespace | B truncate database | C drop/recreate demo database |
| --- | --- | --- | --- |
| Preserve unrelated data (30) | 5 | 0 | 3 |
| Safe rerun (30) | 5 | 4 | 5 |
| Simplicity (20) | 3 | 5 | 4 |
| Blast radius (20) | 5 | 1 | 3 |
| **Total** | **460** | 240 | 380 |

Sensitivity: kept 24/24.

### D4 — invalid data and bad passwords

| Criterion (weight) | A valid DB states + rejection catalogue | B documentation only | C Playwright E2E suite now |
| --- | --- | --- | --- |
| Coverage of rejections (30) | 5 | 2 | 5 |
| Test pyramid / CI fit (30) | 5 | 1 | 2 |
| Effort (20) | 3 | 5 | 1 |
| Manual testability (20) | 5 | 3 | 4 |
| **Total** | **460** | 250 | 310 |

Sensitivity: kept 24/24.

### D6 — states the services cannot create (added after review-local)

| Criterion (weight) | A clock + maintenance job, SQL for hidden only | B direct SQL for all | C drop those fixtures |
| --- | --- | --- | --- |
| Fidelity to real rules (35) | 5 | 2 | 5 |
| Coverage of states (25) | 5 | 5 | 1 |
| Simplicity (20) | 3 | 4 | 5 |
| Safety (20) | 5 | 3 | 5 |
| **Total** | **460** | 335 | 400 |

Sensitivity: kept 24/24. Owner chose A on 2026-10-24.

### D5 — target guard

| Criterion (weight) | A DEV + `_demo` name + `--confirm` | B refuse `NODE_ENV=production` only | C new DEMO tier suffix |
| --- | --- | --- | --- |
| Production safety (40) | 5 | 3 | 5 |
| Mistake resistance (30) | 5 | 2 | 4 |
| Simplicity (20) | 3 | 5 | 2 |
| Fit with existing tiers (10) | 5 | 5 | 2 |
| **Total** | **460** | 330 | 380 |

Sensitivity: kept 24/24.

## 11. Acceptance criteria (for the later implementation)

- AC1: `npm run seed:demo -- --confirm` on an empty migrated `happihub_demo` creates the
  personas, associations and events of §§ 3–4 and the credentials file in mode `0600`.
- AC2: a second run creates nothing and changes no unrelated row.
- AC3: each guard condition of § 2 refuses the run with a non-zero exit and writes nothing.
- AC4: no clear email exists in `account`, `invitation` or `outbox_message` after the run.
- AC5: Claire, Malik and Sofia sign in through the browser with the generated passwords;
  Sofia cannot edit Demo Tréteaux du Quartier events (404); Inès sees exactly what the brick B visibility rules allow (the published, non-hidden events)
  and never the drafts E15–E16 or the hidden E19.
- AC6: every rejection case of § 5 has a passing integration test.
- AC7: `server/.demo-credentials.local.json` is added to `.gitignore`; `git status` stays clean
  after a run.
- AC8: a `--reset` followed by a reseed stays below the `EVENT_QUOTA` limit (no 429).
