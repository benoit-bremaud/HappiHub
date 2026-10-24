# Partner API: server-to-server event integration (#244)

Status: **decisions D0–D4 validated by Benoît on 2026-10-24** (all top MCDA scores); the whole
conception awaits his explicit validation after review. No code is authorized by this document
until then; implementation is the V1 brick C of the [implementation gate](v1-implementation-gate.md),
extended by D0. Diagrams: [partner-api/](../diagrams/partner-api/).

## 1. Need and scope

Other websites and applications, starting with the owner's own projects (Brasse-Bouillon,
a theatre company's site), call HappiHub **from their servers** to read an association's
public events and to **create event drafts** on its behalf (owner vision on #244, 2026-10-19
and 2026-10-22: a private API open to his projects for event creation). Browser cookies,
CSRF and sessions (ADR-0001) are not the integration mechanism.

Builds on the validated V1 conception: J6 D1–D3, [UC27/UC28](v1-use-cases.md#website-integration),
[02c](../diagrams/v1-events/02c-sequence-api-retrieve-events.md), class `ApiKey` (04), quotas
(§ Quotas of the use cases), decision I1 (automatic revocation after 180 days unused).

Out of scope: publication, cancellation or deletion by key (D0), outbound webhooks (D3),
multi-association integration clients and aggregators (D1), flyer generation (#62), images,
browser/CORS access, a public developer portal.

### Amendment to the V1 framing

[V1 product framing](v1-product-framing.md) lists "Write API" as out of scope. D0 amends it:
a **draft-only** write API is in scope; publishing stays a member action (UC18). The framing
and J6 D3 get a pointer to this spec when it is merged.

## 2. Decisions (MCDA, weights /100, scores 0–5, totals /500)

| # | Question | Validated choice | Score | Runner-up |
| --- | --- | --- | --- | --- |
| D0 | Scope | Read + create/edit **drafts**; a member publishes in HappiHub | 370 | Read-only 350, full write 340 |
| D1 | Integration identity | UC27 association keys extended with **scopes**; one key acts for one association | 430 | Platform client authorized per association 350, OAuth 2 client credentials 290 |
| D2 | Duplicate safety | `Idempotency-Key` required on create, 24 h replay; edits use `baseVersion` merge (brick B) | 405 | Partner `externalId` + PUT upsert 400 |
| D3 | Webhooks | None; polling with `updatedSince`; webhooks tracked in a backlog issue | 450 | HMAC webhooks now 270 |
| D4 | Drafts a write key may edit | Only drafts **created by that key** | 465 | All drafts of the association 265 |

Criteria and sensitivity checks:

- **D0** — goal fit 35, security 25, simplicity 15, V1 consistency 15, reversibility 10.
  A read-only 1/5/5/5/4, B full write 5/3/2/2/3, C drafts 4/4/3/3/4. Goal fit 45 (security
  20, consistency 10) → C 375, B 365, A 310. Security 35 (goal 25) → **A 390**, C 370: the
  choice is sensitive to the security weight (corrected after the vote, which was shown an
  erroneous "C 380"; reconfirmed by the owner, § 11).
- **D1** — security 30, simplicity 25, fit to the owner's projects 20, UC27 consistency 15,
  evolvability 10. A 4/5/4/5/3, B 4/2/5/2/5, C 5/1/3/1/4. Fit 35 (simplicity 10) → A 415, B 395.
- **D2** — no duplicates 30, simplicity 25, sync fit 20, brick B consistency 15, standard 10.
  A 4/4/3/5/5, B 5/3/5/3/3. Close: sync fit 30 (simplicity 15) → B 420 over A 395. Revisit B
  if a partner must mirror an existing catalogue (recorded as a known trade-off).
- **D3** — simplicity 30, security (SSRF) 25, freshness 20, J6 consistency 15, reliability 10.
  A 5/5/3/5/4, B 2/2/5/2/3. Freshness 50 (simplicity 15, security 10) → A 390, B 360.
- **D4** — stolen-key blast radius 35, real need 25, simplicity 20, 02a consistency 20.
  A 5/5/4/4, B 2/3/5/3. Need 50 (blast radius 10) → A 460, B 330.

Derived rules (consequences of D0–D4, validated with the whole conception):

- R1 A key has scopes `events:read` (always) and optionally `events:write`, chosen at creation
  and **immutable**; changing scope means creating a new key (rotation, UC27 3b).
- R2 Only a **verified** member may create a key with `events:write`.
- R3 Drafts created by key count in the association's 20 creations / 24 h quota (UC15 1a).
- R4 A key-created draft has `created_by` = null and `created_by_api_key_id` set; member views
  show "created via key *name*". A key edit sets `last_edited_by` = null and
  `last_edited_by_api_key_id`. Account ids are never exposed to partners.
- R5 Revoking a key (UC27 3a, I1) keeps its drafts; members can still edit, publish or delete
  them. After revocation no key can edit them.
- R6 Once a member publishes a key-created draft, the key can only read it (D0); partners
  learn it through `updatedSince` (D3).
- R7 Creation and revocation of keys and every key write land in the association activity log
  (J4), with the key name, never the secret.

## 3. Acceptance criteria

| # | Criterion |
| --- | --- |
| AC1 | A request without a valid, non-revoked key answers `401 API_KEY_INVALID` without detail; the response time does not depend on whether the key id exists. |
| AC2 | A read key on a write route answers `403 SCOPE_REQUIRED`; it never creates or changes anything. |
| AC3 | A key never reads or writes another association's data; any foreign, unknown or member-created draft id answers `404 EVENT_NOT_FOUND` (D4, no existence leak). |
| AC4 | `POST /api/v1/events` without `Idempotency-Key` answers `400 IDEMPOTENCY_KEY_REQUIRED`; a replay with the same key and body within 24 h returns the stored response and creates nothing; same key, different body answers `422 IDEMPOTENCY_KEY_REUSED`; a concurrent in-flight duplicate answers `409 IDEMPOTENCY_IN_PROGRESS`. |
| AC5 | Key writes reuse the brick B field allow-list, validation and merge (`baseVersion`, `base`, `409 EDIT_CONFLICT`) unchanged. |
| AC6 | No route lets a key publish, cancel, delete, or edit a non-draft event (`404` per AC3 for non-drafts it did not create; `409 EVENT_READ_ONLY` for its own drafts published meanwhile). |
| AC7 | Reads return only published, cancelled (and archived with `include=past`) events of the key's association with the J5 public fields (UC28 unchanged); drafts are never listed on read routes. |
| AC8 | Rate limits: 60 / min per IP before key lookup, 600 / h per key for reads, 60 / h per key for writes, `429` + `Retry-After`; the association creation quota applies (R3). |
| AC9 | Routes under `/api/v1` accept no cookie session and send no CORS headers; a request carrying a `Cookie` is processed as key-only (the cookie is ignored). |
| AC10 | Secrets are shown once, stored as SHA-256 hashes, never logged (request logs redact `Authorization`). |
| AC11 | An OpenAPI 3.1 description `docs/api/partner-v1.openapi.yaml` is the authoritative contract and is checked against the implementation in tests (every route, status and error code). |
| AC12 | Association suspended or closed: `403 ASSOCIATION_UNAVAILABLE` on every route (UC28 2c). |

## 4. Contract (`/api/v1`, JSON, server-to-server only)

Authentication: `Authorization: Bearer hh_live_<keyId>_<secret>` (02c format). Lookup by
`keyId`, constant-time comparison of SHA-256(secret); unknown ids compare against a dummy hash
(AC1). `lastUsedAt` written at most once per hour.

| Method and path | Scope | Success | Notes |
| --- | --- | --- | --- |
| `GET /v1/events` | read | 200 | UC28: upcoming published + cancelled, soonest first; `include=past`, `updatedSince`, `cursor`, `limit` (≤ 100) |
| `GET /v1/events/{id}` | read | 200 | UC28 3; public fields + `status`, `updatedAt` |
| `POST /v1/events` | write | 201 | Creates a draft; `Idempotency-Key` header (1–255 printable ASCII) required; body = brick B editable fields, `title` and `type` required; answer adds `version` and `Location` |
| `GET /v1/drafts` | write | 200 | Drafts created by this key only (D4), with `version` |
| `GET /v1/drafts/{id}` | write | 200 | Same filter |
| `PATCH /v1/drafts/{id}` | write | 200 | `{baseVersion, changes, base?}` exactly as brick B |

Drafts live under `/v1/drafts` so that read routes never mix them with public events (AC7).

Versioning: the major version is in the path. Within `v1` only additive changes (new optional
fields, new error codes documented beforehand); partners must ignore unknown fields. A breaking
change opens `/v2`; `v1` then stays served at least 6 months, announced by a `Deprecation` and
`Sunset` header and an email to members owning active keys.

Errors: always `{message, code, details?}` (brick B format); codes listed in the OpenAPI file.
Status set: 400, 401, 403, 404, 409, 422, 429, 503.

Concurrency: optimistic, `version` per event (brick B). A member and a key editing the same
draft merge field by field; true conflicts answer `409 EDIT_CONFLICT` with `lastEditedBy` set
to the member's display name or "key *name*".

Idempotency store: `(api_key_id, idempotency_key)` primary key, request body SHA-256, response
status and body, `created_at`; rows purged after 24 h by the maintenance job (02d). An
in-progress row (no response yet) blocks duplicates (AC4); a failed request (5xx) deletes its
row so the partner can retry.

## 5. Data model changes (delta on brick B)

- `api_key`: `id`, `association_id`, `name` (1–60), `secret_hash` (bytea, unique), `scopes`
  text[] (`events:read`, `events:write`), `created_by` (account, set null), `created_at`,
  `last_used_at`, `revoked_at`, `revocation_notice_at` (04 class + scopes). At most 5 active
  per association (UC27 1a).
- `event`: `created_by_api_key_id`, `last_edited_by_api_key_id` (FK `api_key`, set null),
  CHECK at most one of `created_by` / `created_by_api_key_id` set by the creation path.
- `api_idempotency`: as § 4.
- `activity_entry` actions: `API_KEY_CREATED`, `API_KEY_REVOKED`, `API_KEY_AUTO_REVOKED`,
  `EVENT_CREATED_BY_KEY`, `EVENT_EDITED_BY_KEY`, with `detail.keyName`.

Encryption at rest (ADR-0004): key names and event content are not personal data; secrets are
hashed. No new personal column.

## 6. Threat model (STRIDE, assets: association events, key secrets, availability)

| # | Threat | Mitigation |
| --- | --- | --- |
| T1 | Spoofing: leaked key (repo, logs, shared hosting) | Recognizable `hh_live_` prefix for secret scanners; hash-only storage; per-key revocation; 180-day auto-revocation (I1); write scope opt-in (R1–R2); write limited to own drafts (D4) so a leak cannot publish or deface public pages (D0) |
| T2 | Spoofing: key enumeration / brute force | 256-bit secret; per-IP limit before lookup; uniform 401 and timing (AC1) |
| T3 | Tampering: overwrite a member's draft | D4 filter; brick B merge and `409` on conflict |
| T4 | Repudiation: who changed an event | Activity log with key name (R7); `last_edited_by_api_key_id` |
| T5 | Information disclosure: drafts, member data, other associations | Read routes return public fields only (AC7); drafts only to their creating key; scoped queries by `association_id`; 404 for anything else |
| T6 | Information disclosure: secret in logs or errors | Redacted `Authorization`; generic errors; secret shown once |
| T7 | Denial of service / spam drafts | Per-IP and per-key limits (AC8); association creation quota (R3); body size limit 64 KB; drafts never public |
| T8 | Elevation: key used to manage keys, members or publish | Key routes expose no management or lifecycle action; key management stays session + CSRF (UC27) |
| T9 | Browser abuse (CSRF, XSS exfiltration with cookie) | No cookie auth on `/v1`, no CORS (AC9) |
| T10 | Replay creating duplicates | Idempotency store (D2) |
| T11 | Stored XSS on public pages via partner content | Same plain-text validation as brick B (control and bidi characters refused); output encoding on the client |

Residual risks: a leaked write key can fill the association's drafts up to the quota until it
is revoked (visible in the activity log); no anomaly detection in V1.

## 7. Traceability

| Element | Use case | Diagram |
| --- | --- | --- |
| Manage scoped keys | UC27 (amended: scopes, R1–R2) | [01 use case](../diagrams/partner-api/01-use-case.md) |
| Retrieve events | UC28 (unchanged) | 01, v1 [02c](../diagrams/v1-events/02c-sequence-api-retrieve-events.md) |
| Create draft by key | **UC34** (new, § 8) | 01, [02 sequence](../diagrams/partner-api/02-sequence-create-draft.md) |
| Edit own draft by key | **UC35** (new, § 8) | 01, 02, 03 |
| Publish a key-created draft | UC18 (unchanged, member) | 01 |
| Components | — | [03 component](../diagrams/partner-api/03-component.md) |
| Data delta | — | [04 class](../diagrams/partner-api/04-class.md) |

Key lifecycle (Active → Revoked, manual or automatic) has two states and no extra transition;
no state diagram is needed (proportionality).

## 8. New use cases

### UC34 — Create an event draft from a partner site

- **Level**: user goal. **Primary actor**: partner website (system actor) acting for an association.
- **Preconditions**: key valid, non-revoked, with `events:write`; association active.
- **Minimal guarantee**: nothing is published; a retry never duplicates a draft.
- **Success guarantee**: a draft owned by the key's association exists, attributed to the key
  and logged; the partner receives its `id` and `version`.
- **Main success scenario**: 1. The site server sends `POST /api/v1/events` with an
  `Idempotency-Key` and the fields. 2. The system authenticates the key, checks the scope,
  limits and quota, validates the fields, creates the draft, logs it and answers 201.
  3. Members see the draft "created via key *name*" and publish it with UC18.
- **Extensions**: 1a. Same idempotency key and body: stored response, no new draft. 1b. Same key,
  other body: 422. 2a. Missing scope: 403. 2b. Quota or rate limit: 429 + `Retry-After`.
  2c. Invalid field: 400 with `details.field`.

### UC35 — Edit an own event draft from a partner site

- **Primary actor**: partner website. **Preconditions**: as UC34; the draft was created by
  this key and is still a draft.
- **Main success scenario**: 1. `PATCH /api/v1/drafts/{id}` with `baseVersion`. 2. The system
  merges as brick B, increments `version`, logs it, answers 200.
- **Extensions**: 2a. Concurrent member edit on the same field: 409 `EDIT_CONFLICT`.
  2b. Published meanwhile: 409 `EVENT_READ_ONLY`. 2c. Not created by this key: 404.

## 9. Documentation deliverables (API quality is the owner's top priority)

- `docs/api/partner-v1.openapi.yaml` (authoritative, AC11) and a partner guide
  `docs/api/partner-guide.md`: key creation, curl / PHP (WordPress) / Node snippets for read,
  create with idempotency, edit with conflict handling, polling with `updatedSince`, error table.
- `docs/API_DOCUMENTATION.md` gets a "Partner API" section linking both.

## 10. Implementation plan (for after validation)

1. Migration: `api_key`, event columns, `api_idempotency`.
2. Key management routes (session + CSRF) for UC27 with scopes; client screen deferred to
   the client UI batch unless the owner asks otherwise (a member can create keys via API meanwhile).
3. `middleware/apiKeyAuth`, `/v1` router, read routes UC28, write routes UC34–UC35 reusing the
   brick B event service (no duplicated validation or merge).
4. Maintenance job: idempotency purge, I1 auto-revocation and notice.
5. Tests: unit (key parsing, scope check, idempotency hashing), PostgreSQL integration for
   AC1–AC12, OpenAPI conformance test.
6. Docs § 9.

Follow-up issues to file on merge: outbound webhooks (D3), `externalId` sync (D2 runner-up),
platform integration clients (D1 runner-up).

## 11. Validation record

- 2026-10-24: D0–D4 chosen by Benoît (top scores). D0 sensitivity corrected after the vote
  (security weight 35 favours read-only A 390 over C 370); reconfirmation pending.
- Whole conception: pending review-local and Benoît's explicit validation.
