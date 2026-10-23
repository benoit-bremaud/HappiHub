# Encryption of sensitive data at rest (#310)

Status: **conception validated by Benoît on 2026-10-23** (D1–D7 option A; staged key rotation
B 460/500 over full stop D 415). Implementation is a separate brick under this spec. Proposed ADR:
[ADR-0004](../decisions/0004-encrypt-sensitive-data-at-rest.md). Diagrams:
[db-encryption/](../diagrams/db-encryption/).

Scope chosen by the owner on 2026-10-22 (option A, 405/500): volume/disk encryption and TLS to
PostgreSQL, **plus** application-level AES-256-GCM on sensitive columns with an HMAC blind index
for email lookups. Owner wish: "ideally everything encrypted, if possible" — § 3 scores how far
that is reasonable.

## 1. Need and acceptance criteria

Need: a stolen disk, volume snapshot, database dump, backup or SQL-read primitive must not
reveal the personal data of account holders, invitees or association contacts (GDPR art. 32,
"encryption of personal data" as an appropriate measure; [V1 data flow 06](../diagrams/v1-events/06-data-flow.md)
DF1–DF5 identifies the personal data).

| # | Acceptance criterion |
| --- | --- |
| AC1 | No column classified *Personal* (§ 2) holds plaintext: a raw `SELECT` shows only `hh1.` envelopes or blind-index bytes. |
| AC2 | Every current behavior is unchanged: sign-up uniqueness, sign-in, verification resend, reset, email change, invitations (create, list, accept, duplicate refusal), member lists, export, deletion, outbox delivery and quotas, maintenance reminders. |
| AC3 | Encryption keys never live in the database, the repository, logs or error messages. |
| AC4 | Production refuses to start without a valid keyring, a blind-index key, or a TLS-protected database URL (unless the database is on the same host, § 7). |
| AC5 | A key rotation re-encrypts every envelope to the new key without downtime; the old key is removed only when no envelope uses it. |
| AC6 | Tampered, swapped (other column) or unknown-key envelopes fail closed with a generic error that contains neither ciphertext nor plaintext. |
| AC7 | Account deletion still erases every row holding the person's addresses (invitations, outbox) by blind index. |
| AC8 | Overhead per request stays negligible (budget: < 1 ms added on the slowest current endpoint, member list). |

## 2. Data classification (verified in code, main 8ff8177)

| Table.column | Content | Class | Today | Proposed |
| --- | --- | --- | --- | --- |
| account.email | Sign-in address, unique, looked up | Personal + lookup | clear, `UNIQUE`, `CHECK lower` | `email_enc` + `email_bidx UNIQUE` |
| account.pending_email | Address awaiting verification, looked up | Personal + lookup | clear | `pending_email_enc` + `pending_email_bidx` |
| account.display_name | Chosen name | Personal | clear | `display_name_enc` |
| account.password_hash | bcryptjs hash | Secret, derived | hashed | unchanged |
| auth_token.token_hash, invitation.token_hash | SHA-256 of link tokens | Secret, derived | hashed | unchanged |
| invitation.email | Invitee address, looked up and unique per association | Personal + lookup | clear, partial unique | `email_enc` + `email_bidx` (partial unique on `association_id, email_bidx`) |
| association.contact_email | Association contact (often a person) | Personal | clear | `contact_email_enc` |
| outbox_message.recipient | Destination address, quota and erasure key | Personal + lookup | clear, indexed | `recipient_enc` + `recipient_bidx` |
| outbox_message.payload | Verification/reset/invitation links, names | Secret (live tokens) + personal | clear jsonb | `payload_enc` (whole JSON in one envelope) |
| session.sess | `cookie`, `accountId`, `authVersion`, `startedAt`, `csrfToken` | Technical, no PII | clear json | unchanged (D4) |
| activity_entry.detail | Edited field names, deleted event title | Organizational | clear jsonb | unchanged (D1 option A) |
| event.* | Event content | Public once published; drafts organizational | clear | unchanged (D1) |
| association name/slug/city/presentation/website | Public association profile | Public | clear | unchanged |

Not personal: ids, timestamps, statuses, roles, counters. Emails in memory-only rate limiters
(`ctx.limits.recipient`) never reach the database.

## 3. Layers

1. **L1 — storage**: the PostgreSQL data directory and its WAL sit on an encrypted volume
   (LUKS or the host's encrypted block storage); backups (`pg_dump`) are encrypted before they
   leave the host (`age` with an offline recipient key). Hosting is still open (T11); this is a
   **requirement on the hosting choice**, not code.
2. **L2 — transport**: TLS `sslmode=verify-full` whenever the database is not on the same host (§ 7).
3. **L3 — application fields**: AES-256-GCM envelopes and HMAC-SHA256 blind indexes (§ 4–5),
   so keys stay outside the database: dumps, replicas, SQL injection reads and the hosting
   provider see only ciphertext.

## 4. Envelope format and cipher (D6)

`hh1.<kid>.<base64url(iv ‖ ciphertext ‖ tag)>` stored in `text` columns.

- AES-256-GCM (`node:crypto` `createCipheriv('aes-256-gcm')`), 12-byte random IV per value,
  16-byte tag. Verified on Node 22.23.3 (round trip, `setAAD`, `getAuthTag`).
- AAD = `"<table>.<column>"`: an envelope copied into another column fails to decrypt (AC6).
  Cross-row swap inside the same column is an accepted risk: it needs database write access.
- `kid`: short key id (`[a-z0-9]{1,16}`, e.g. `k2026a`); reads accept any key of the keyring,
  writes use the active key. Random IVs: well below the 2³² messages per key limit for GCM.
- Empty/`NULL` stays `NULL` (presence is not hidden). Lengths leak approximately (accepted).

## 5. Blind index and normalization (D5)

`bidx = HMAC-SHA256(blindIndexKey, "email:" + foldEmail(value))`, full 32 bytes in `bytea`.

- `foldEmail` (existing `server/domain/email.js`: trim + lowercase) is the **single**
  normalization, applied before both the envelope and the index. The current `CHECK (email =
  lower(email))` cannot apply to ciphertext; the rule moves to the domain function and a test.
- One `email` purpose shared by every email column, so `invitation.email_bidx =
  account.email_bidx` and erasure by address keep working in SQL.
- Dedicated key, distinct from the encryption keys; never rotated routinely (rotation means a
  full recomputation, § 6.3).
- Equality leaks (two rows with the same address are visible as such): needed for uniqueness
  and accepted. Without the key a dictionary attack on the index is infeasible.

## 6. Keys

### 6.1 Custody (D2)

A JSON keyring file outside the repository, path in `FIELD_KEYRING_FILE_<SUFFIX>` (suffix as
in `appConfig.js`: DEV/TEST/PROD), mode `0400`, owned by the service user:

```json
{ "active": "k2026a", "keys": { "k2026a": "<base64 32 bytes>" }, "blindIndex": "<base64 32 bytes>" }
```

Values shown are placeholders. Production refuses to boot when the file is missing or invalid
JSON, the active key is absent, or any key is not 32 bytes (AC4). The `0400` mode is an operator
step (checked automatically only in a follow-up, § 14). Tests generate a throw-away keyring in memory; local
development uses a generated file under a git-ignored path. A copy of the keyring is kept in
the owner's password manager: **losing it loses the data**, and it is never stored with backups.

### 6.2 Lifecycle and rotation (state diagram 04)

`generated → staged → active → retiring → retired → archived`. Rotation, staged so several processes never disagree: add the new key as *staged* (in the
keyring, not active) and restart every process (API, maintenance, migrate, reencrypt); then
switch `active` to it and restart again;
run the re-encryption job (`npm run reencrypt`, batches of 200 rows, `FOR UPDATE SKIP LOCKED`,
idempotent: rows whose envelope `kid` ≠ active are decrypted and re-encrypted), the job reports
remaining counts per column; remove the old key from the runtime keyring only at zero (AC5), but keep a decrypt-only
archived copy in the password manager until the last backup taken before the rotation has
expired (restores must stay readable); destroy it only then. Cadence: yearly, or at once
after a suspected leak.

Rotation procedure MCDA (2026-10-23, validated): staged B 460, full stop D 415, hot reload C 355,
one-step A 325 (criteria: correctness during process overlap 35, KISS 25, operations 15,
multi-instance future 15, testability 10).

### 6.3 Blind-index key change (exceptional)

Only after a leak of that key: add `*_bidx2` columns, recompute from decrypted values, swap
unique constraints, drop the old columns — a dedicated migration under its own approval.

## 7. Transport to PostgreSQL (D7)

ADR-0003 places PostgreSQL next to the API. Rule: in production the URL host must be a Unix
socket path or a loopback address, **or** carry `sslmode=verify-full` (`pg-connection-string`
2.x in `pg` 8.23.1 maps it to `ssl.rejectUnauthorized = true` with host check; `sslrootcert`
for a private CA). Anything else refuses to boot. The check lives in one `config/`
helper called by every entry point: `server.js`, `jobs/runMaintenance.js` (both `new pg.Pool`)
and `jobs/migrate.js` (`node-pg-migrate`). It requires the literal `sslmode=verify-full`
(pg-connection-string 2.14.1 currently upgrades `require`/`verify-ca` to verify-full with a
warning, but its v3 returns to weaker libpq semantics), reads a Unix socket from the `host`
query parameter, and forbids an explicit `ssl` option in the Pool config, which would override
`sslmode`.

**Compose production baseline (design gap found during implementation, validated by Benoît on
2026-10-23, option A 425/500)**: `docker-compose.prod.yml` reached PostgreSQL by its service name
`postgres` on an internal Docker network, which this rule refuses. The API now reaches it only
through the Unix socket on a shared `postgres_socket` volume (`?host=/var/run/postgresql`) and
leaves the database network; `POSTGRES_INITDB_ARGS=--auth-local=scram-sha-256` keeps a password on
the socket (the image trusts local connections by default). MCDA (security 30, D7 kept unchanged 25,
KISS 25, operations 10, testability 10): A socket volume 425, D defer to hosting 360 (baseline would
not boot), B TLS with a private CA 325, C allow-list of internal host names 290 (weakens D7).
Sensitivity: KISS 40 / security 15 keeps A first (425 vs 390). The URL is parsed with WHATWG `URL`:
the user-only form `postgres://u:p@/db` is refused (fail closed); use `@localhost/db?host=…`.

## 8. Impact on code (for the implementation brick, not authorized yet)

New pure module `server/domain/fieldCipher.js` (named exports: `createFieldCipher(keyring)` →
`{ encrypt(column, value), decrypt(column, envelope), blindIndex(value), needsRotation(envelope) }`),
built once in `server.js` from the keyring loader in `config/` and passed in `ctx` like `limits`
and `links`. Services call it at their SQL boundary; no ORM, no repository layer (KISS).

| Service / job | Change |
| --- | --- |
| accounts.signUp | `INSERT … (email_enc, email_bidx)`; `ON CONFLICT (email_bidx)` |
| accounts.authenticate, requestPasswordReset | `WHERE email_bidx = $1` |
| accounts.resendVerification | `WHERE (email_bidx = $1 AND …) OR pending_email_bidx = $1` |
| accounts verify / updateAccount | move `pending_email_*` pair; uniqueness check by bidx |
| accounts.toAccount, export | decrypt email, pending email, display name, and `invitation.email_enc` in `invitationsSent` (`accounts.js:186-196`) |
| accounts.deleteAccount | `DELETE … WHERE email_bidx = ANY($1)` / `recipient_bidx = ANY($1)` |
| invitations.* | insert/list/accept with `email_enc`/`email_bidx`; `invitation.email !== account.email` compares decrypted folded values |
| associations | member list decrypts names/emails; `contact_email_enc` read/write |
| outbox.queueEmail / deliverOutbox | encrypt recipient+payload; transport receives decrypted message; failure path nulls `payload_enc` |
| events | `last_edited_by_name` projection decrypts `display_name_enc` (`events.js:16`); draft-cleanup notice decrypts member emails before `queueEmail` (`events.js:294-297`) |
| jobs/maintenance | reminder selects `email_enc` and decrypts |
| new jobs/reencrypt.js | rotation job (§ 6.2) |
| docker-compose.prod.yml / docker-compose.yml | socket volume and `field_keyring` secret (§ 7); local keyring bind mount |

Logging: decrypted values are never logged in production (the log transport is already refused
there); decrypt errors throw a generic `FieldCipherError` without values.

### Migration (D3)

V1 has never been deployed (no production data, HANDOVER): one SQL migration replaces the clear
columns by the encrypted and blind-index columns, without backfill: `account.email UNIQUE` →
`email_bidx UNIQUE`; `CHECK lower` on `email` and `pending_email` dropped (rule in `foldEmail`);
`invitation_pending_email_uq` → `(association_id, email_bidx) WHERE status = 'PENDING'`;
`invitation_email_idx` → on `email_bidx`; `outbox_message_recipient_idx` → on `recipient_bidx`; local
databases are reset (`npm run migrate` on a fresh volume). Down migration restores the clear
column shapes empty. A backfill procedure is needed only for a change after the first deployment
and gets its own study then.

## 9. Threat model

| Threat | Covered by | Residual |
| --- | --- | --- |
| T1 stolen disk / snapshot | L1 + L3 | — |
| T2 leaked dump or backup | backup encryption + L3 | metadata (ids, dates, public events) |
| T3 SQL injection read | L3 (keys not in DB) | equality of emails visible via bidx |
| T4 DB credential leak, hosting operator | L3 | same as T3 |
| T5 network sniffing | L2 | none on same host |
| T6 full API host compromise | **not covered** (keys in process memory) | accepted; mitigations are hardening, not crypto |
| T7 ciphertext moved to another column | AAD | same-column row swap needs write access (accepted) |
| T8 bidx key leak | separate key; HMAC | dictionary attack on emails possible → § 6.3 |
| T9 session dump | no PII in `sess`; `sid` useless without the cookie signature secret | — |

## 10. Decisions (MCDA, scores 0–5, weights sum to 100, totals /500)

Validated by Benoît on 2026-10-23: D1 A 390, D2 A 435, D3 A 415, D4 A 460, D5 A 470, D6 A 450,
D7 A 440. Recorded fallbacks: D1 A' 385, D2 B 410.

### D1 — Encryption scope

Criteria: personal-data protection 30, owner wish "everything" 15, KISS/maintenance 20,
features preserved (search, sort, uniqueness) 20, performance 5, testability 10.

| Option | Prot. 30 | Wish 15 | KISS 20 | Features 20 | Perf 5 | Test 10 | Total |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **A** Personal columns of § 2 | 4 (all PII) | 3 | 3 | 5 | 5 | 4 | **390** |
| A' A + `activity_entry.detail` | 4 (no PII added) | 4 | 2 (extra jsonb path) | 5 | 5 | 4 | 385 |
| C Emails only | 3 (names/contact clear) | 2 | 4 | 5 | 5 | 4 | 365 |
| D L1+L2 only | 2 (dumps readable) | 1 | 5 | 5 | 5 | 5 | 350 |
| B Everything incl. event drafts | 5 | 4 | 1 | 1 (public list/search/sort break) | 3 | 2 | 285 |

A vs A': near tie (5 points); A' adds a code path for data that is not personal. A vs C: A also
covers names and contacts for one more column each. Sensitivity: moving 15 points from KISS to "wish"
(wish 30, KISS 5) makes A' win, 415 vs 390 — the owner's weight on "everything" decides between them.

### D2 — Key custody

Criteria: separation from DB/repo/logs 30, zero budget and EU 20, KISS 20, operations
(rotation, key backup) 15, testability 15.

| Option | Sep. 30 | Budget 20 | KISS 20 | Ops 15 | Test 15 | Total |
| --- | --- | --- | --- | --- | --- | --- |
| **A** Keyring file, path in env | 4 | 5 | 4 | 4 | 5 | **435** |
| B Keys as env values | 3 (env leaks: `/proc`, `docker inspect`, child processes) | 5 | 5 | 3 | 5 | 410 |
| C External KMS/Vault | 5 | 1 | 1 | 4 | 2 | 280 |
| D pgcrypto, key sent in SQL | 1 (key in `pg_stat_activity`, logs) | 5 | 3 | 2 | 3 | 265 |

A beats B on separation and multi-key rotation for a small KISS cost. Fallback: B.

### D3 — Migration strategy

Criteria: data safety 25, KISS 30, reversibility 15, developer friction 15, fit with SQL migrations 15.

| Option | Safety 25 | KISS 30 | Rev. 15 | Friction 15 | Fit 15 | Total |
| --- | --- | --- | --- | --- | --- | --- |
| **A** Replace columns, no backfill (no prod data) | 4 | 5 | 3 | 3 | 5 | **415** |
| C A + written backfill procedure now | 4 | 4 | 3 | 3 | 5 | 385 |
| B Expand / JS backfill / contract | 5 | 2 | 5 | 5 | 2 | 365 |

A wins because no deployed data exists; C documents a procedure nobody needs yet (YAGNI).

### D4 — Session table

Criteria: protection 30, compatibility with express-session/connect-pg-simple 25, KISS 25,
performance 10, testability 10.

| Option | Prot. 30 | Compat. 25 | KISS 25 | Perf 10 | Test 10 | Total |
| --- | --- | --- | --- | --- | --- | --- |
| **A** Unchanged, sess kept PII-free (test asserts its keys) | 4 | 5 | 5 | 5 | 4 | **460** |
| B Store subclass encrypting `sess` | 5 | 2 | 2 | 4 | 3 | 320 |
| C Store HMAC of sid | 5 | 1 (fork) | 1 | 5 | 2 | 270 |

### D5 — Blind index form

Criteria: uniqueness correctness 30, enumeration resistance 30, KISS 20, cross-table equality 20.

| Option | Correct 30 | Resist. 30 | KISS 20 | Cross 20 | Total |
| --- | --- | --- | --- | --- | --- |
| **A** Full HMAC-SHA256, one `email` purpose, dedicated key | 5 | 4 | 5 | 5 | **470** |
| C Per-table keys | 5 | 5 | 3 | 3 | 420 |
| B Truncated 8-byte HMAC | 1 (collisions break UNIQUE) | 5 | 4 | 3 | 320 |

### D6 — Envelope

Criteria: security 30, KISS 25, debuggability 15, rotation support 20, storage 10.

| Option | Sec. 30 | KISS 25 | Debug 15 | Rot. 20 | Storage 10 | Total |
| --- | --- | --- | --- | --- | --- | --- |
| **A** Text `hh1.kid.b64url`, AAD table.column | 4 | 5 | 5 | 5 | 3 | **450** |
| C A + row id in AAD | 5 | 2 (needs ids generated in the app before insert; today `gen_random_uuid()` defaults) | 5 | 5 | 3 | 405 |
| B Binary `bytea` | 4 | 4 | 2 | 5 | 5 | 400 |

### D7 — TLS rule

Criteria: security 35, fit with ADR-0003 same-host 25, KISS 25, testability 15.

| Option | Sec. 35 | Fit 25 | KISS 25 | Test 15 | Total |
| --- | --- | --- | --- | --- | --- |
| **A** Loopback/socket or `verify-full`, else refuse boot | 4 | 5 | 4 | 5 | **440** |
| B TLS always, even on loopback | 5 | 2 | 3 | 5 | 375 |
| C Documentation only | 1 | 5 | 5 | 1 | 300 |

## 11. Tests (for the implementation brick)

- Unit (`fieldCipher`): round trip; tampered tag/IV/ciphertext → error; wrong column AAD → error;
  unknown `kid` → error; decrypt with a retiring key; `needsRotation`; blind index equal for
  `" A@B.fr "` and `"a@b.fr"`; keyring loader refuses missing/short/inactive keys in production;
  errors carry no value.
- Integration (disposable PostgreSQL): raw rows of every *Personal* column contain no `@` and
  start with `hh1.` (AC1); duplicate sign-up refused by `email_bidx`; invitation duplicate refused;
  account deletion removes invitations and outbox rows by bidx (AC7); re-encryption job moves all
  rows to the new key and is idempotent (AC5); session `sess` keys limited to the allowed set (D4);
  boot refuses a non-TLS remote URL (D7).
- Regression: the full existing server (69 unit + 98 integration) and client suites unchanged (AC2).

## 12. Performance

Measured on the owner's machine, Node 22.23.3: AES-256-GCM encrypt of a 19-byte email ≈ 5.4 µs,
HMAC-SHA256 ≈ 1.9 µs (100 000 iterations each). A 50-member list decrypts 100 values ≈ 0.5 ms,
within AC8. Production hardware is unknown (estimate). Lookups use the same B-tree on `bytea`.

## 13. GDPR

- Erasure: the existing deletion cascade removes rows; blind indexes let it find invitations and
  outbox rows by address (AC7). Backups keep erased data until their retention ends — retention
  is decided with hosting (T11) and stated in the privacy notice. Per-person keys
  (crypto-shredding) rejected as YAGNI for V1.
- Access/export: export decrypts the same fields; format unchanged.
- Records of processing: encryption is listed as the art. 32 measure; keys and backups are
  separate assets in the inventory.

## 14. Out of scope / follow-ups

Hosting choice and disk encryption setup (T11), backup tooling and restore drills, an automated
check of the keyring file mode, and any partner API data (#244), which reuses this module.

## 15. Context and verification notes

Context7 was unavailable (monthly quota exhausted on 2026-10-23); behavior was verified instead
against the installed runtime and packages: Node 22.23.3 `node:crypto` (executed round trip),
`pg` 8.23.1 / `pg-connection-string` `sslmode` handling (source read), `connect-pg-simple`
10.0.0 (session table usage).

## 16. Four-pass conception review (2026-10-23)

1. **Requirements and traceability**: AC1–AC8 map to § 2 (AC1), § 8 (AC2, AC7), § 6 (AC3–AC5),
   § 4 (AC6), § 12 (AC8); every *Personal* row of § 2 has a column change in § 8; every
   current email/name query (`accounts`, `invitations`, `associations`, `events`, `maintenance`,
   `outbox`) is listed (corrected after review-local: `events` was missing).
2. **Clean / SOLID**: `fieldCipher` is pure and receives its keyring (dependency inversion);
   file and environment access stay in `config/`; one reason to change per module.
3. **KISS / YAGNI / DRY**: no ORM, repository layer, KMS or per-person keys; one normalization
   (`foldEmail`) and one blind-index purpose; no backfill tooling while no data is deployed.
4. **Pattern fit**: envelope with key id and blind index are the standard field-level encryption
   patterns for a present force (lookups on ciphertext, rotation); no pattern added without one.
