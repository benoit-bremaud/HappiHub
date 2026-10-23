# HappiHub API contract

Current contract after bricks D (accounts and associations) and B (event lifecycle) on
PostgreSQL. Source of truth for behavior: [brick D specification](architecture/specs/v1-brick-d-accounts-associations.md)
and [brick B specification](architecture/specs/v1-brick-b-event-lifecycle.md).
Historical FAQ/GUIDE/tutorials do not define current behavior.

## Authentication and transport

- Browser sessions use an HttpOnly cookie stored in PostgreSQL (`connect-pg-simple`, ADR-0001):
  idle expiry 30 min, absolute cap 8 h. No bearer token is accepted.
- `GET /api/session` returns `{ account | null, csrfToken }`. Every write sends the token in
  `X-CSRF-Token` and must come from the exact configured Origin, otherwise `403`.
- A write with a body must be `application/json`, otherwise `415`. Bodiless writes (no `Transfer-Encoding`, `Content-Length` absent or `0`) are allowed.
- Every response carries `Cache-Control: no-store` and `Referrer-Policy: no-referrer`.
- Email links carry their token in the URL fragment; the client sends it in a JSON body only.
  Only a SHA-256 hash of each token is stored.

## Endpoints (prefix `/api`)

| Method and path | Use case | Success | Notes |
|---|---|---|---|
| `GET /session` | — | 200 | Bootstrap; anonymous or signed-in |
| `POST /session` | sign in | 200 | Neutral `401` for unknown email, wrong password or unverified email (S1-C); rate-limited |
| `DELETE /session` | sign out | 204 | |
| `POST /signup` | UC1 | 202 | `{email, password, associationName?}`; same answer whether or not the email exists, no session opened (N1). Without `associationName` it is an invitee sign-up (UC11 3a, amendment A-D1) |
| `POST /email-verification` | UC2 | 200 | `{token}`; never opens a session (S1-C); returns `signedIn` for an email change made while signed in |
| `POST /email-verification/resend` | UC2 | 202 | `{email}`; neutral |
| `POST /password-reset` | UC3 | 202 | `{email}`; neutral |
| `POST /password-reset/confirm` | UC3 | 200 | `{token, password}`; revokes every other session and also verifies the email (S1-C) |
| `GET /account` | UC4 | 200 | Includes memberships, pending `invitations` (UC11 4c) and `soleMemberOf` |
| `PATCH /account` | UC4 | 200 | Email or password change needs `currentPassword` (per-account limit) |
| `GET /account/export` | UC5 | 200 | JSON download, 3 per day per account |
| `DELETE /account` | UC6 | 204 | `{password, confirm: true}` |
| `POST /associations` | UC1 1b | 201 | `{name}`; at most 5 created per account (`409`) |
| `GET /associations/:slug` | UC7 | 200 | Members only; membership re-checked on each request |
| `PATCH /associations/:slug` | UC7 | 200 | Text fields; slug never changes |
| `POST /associations/:slug/close` | UC8 | 204 | Only the last member |
| `POST /associations/:slug/leave` | UC12 | 204 | Never leaves an association without a member |
| `DELETE /associations/:slug/members/:accountId` | UC12 | 204 | Removed member is emailed |
| `GET /associations/:slug/invitations` | UC10 | 200 | Pending invitations |
| `POST /associations/:slug/invitations` | UC10 | 201 | `{email}`; verified inviter, 10 per association per day (`429` + `Retry-After`) |
| `DELETE /associations/:slug/invitations/:id` | UC10 3a | 204 | Link stops at once |
| `POST /associations/:slug/invitations/:id/resend` | UC10 | 200 | New token, counts in the daily quota |
| `POST /invitations/lookup` | UC11 | 200 | `{token}`; every invalid case is the same `410` |
| `POST /invitations/accept` | UC11 | 200 | `{token}` or `{invitationId}` (the "Join" choice after verification, same verified address only) |
| `GET /associations/:slug/events?status=` | UC16 | 200 | Members only: `{events: [{id, title, type, status, startsAt, ended, updatedAt, lastEditedBy}]}` |
| `POST /associations/:slug/events` | UC15 | 201 | Editable fields with at least `title` and `type`; creates a `DRAFT` at `version` 1. 20 creations per association per 24 h (`429 EVENT_QUOTA` + `Retry-After`) |
| `GET /associations/:slug/events/:id` | UC16 | 200 | Full event with `version`, `lastEditedBy` (display name) |
| `PATCH /associations/:slug/events/:id` | UC16, UC17 | 200 | `{baseVersion, changes: {field: value}, base?: {field: originalValue}}`; merge below |
| `POST /associations/:slug/events/:id/publish` | UC18 | 200 | `{baseVersion}`; guard failures `422 PUBLICATION_REFUSED` with `details.failures` |
| `POST /associations/:slug/events/:id/cancel` | UC19 | 200 | `{baseVersion, confirm: true, reason?}` (≤ 500); final |
| `POST /associations/:slug/events/:id/delete` | UC20 | 204 | `{baseVersion, confirm: true}`; drafts only |
| `GET /events/:id` | public | 200 | No session. Published, cancelled or archived events of an active association, not hidden by moderation; includes `association: {name, slug}`, no account ids, version or editing metadata. Anything else (draft, hidden, unknown or malformed id) is the same `404 EVENT_NOT_FOUND` |
| `/comments` | — | 503 | Legacy routes disabled until the participation/comment brick (S3) |

### Events

Editable fields (allow-list; anything else answers `400 UNKNOWN_FIELD`): `title` (1–120),
`type` (`THEATRE`, `CONCERT`, `EXHIBITION`, `WORKSHOP`, `DANCE`, `CINEMA`, `TALK`, `OTHER`),
`shortDescription` (≤ 280), `longDescription` (≤ 10 000, line breaks allowed), `startsAt`,
`endsAt` (ISO 8601, end ≥ start), `venueLabel`, `venueAddress` (≤ 200), `venueCity` (INSEE
commune code from the bundled COG list, answered as `{code, name}`), `priceKind` (`FREE`,
`AMOUNT`, `PAY_WHAT_YOU_WANT`), `priceAmountCents` (required for `AMOUNT` only), `posterStyle`
(`classic`, `bold`, `paper`, `night`, `pastel`, `minimal`). Text is plain text; control
characters, invisible formatting characters (bidi overrides, zero-width) and line/paragraph
separators answer `400 INVALID_FIELD`; dates need an explicit zone and a real calendar date. Empty optional text is stored as `null`.

- Statuses: `DRAFT` → `PUBLISHED` → `CANCELLED`; `PUBLISHED`/`CANCELLED` → `ARCHIVED` by the
  maintenance job after the effective end (`endsAt`, or `startsAt` + 24 h). `ended` in views
  uses the same rule, so an ended event never looks upcoming before the job runs.
- Merge: with `baseVersion` equal to the current version the changes apply and `version`
  increments. Otherwise each changed field needs its original value in `base`
  (`400 BASE_REQUIRED`); a field still equal to it applies, else `409 EDIT_CONFLICT` with
  `details: {conflicts: [{field, yours, theirs}], lastEditedBy, version}` and nothing is
  written. Clearing a required field of a published event answers `422 PUBLISHED_FIELD_REQUIRED`.
  Start, end or venue changes of a published event set `scheduleChangedAt`.
- Publish guard codes: `MISSING_FIELD:<field>` (title, type, shortDescription, startsAt,
  venueLabel, venueCity), `EMAIL_NOT_VERIFIED`, `START_IN_PAST`.
- Lifecycle `409` codes: `STALE_VERSION`, `INVALID_TRANSITION`, `EVENT_ENDED` (cancel after
  the effective end), `EVENT_READ_ONLY` (any write on a cancelled or archived event),
  `ASSOCIATION_CLOSED`. An event id under another association answers `404 EVENT_NOT_FOUND`.
- Closing an association cancels its upcoming published events ("Association closed"); drafts
  stay until the 30-day association purge. Drafts untouched for 12 months trigger a
  `DRAFT_CLEANUP_NOTICE` to every member and are deleted 14 days later unless edited.
- Member views and the list add `lastEditedByFormerMember`: `true` when the last editor deleted
  their account (shown as "former member"); `lastEditedBy` is `null` also for a member without a display name.
- The account export (UC5) adds `events` created or last edited by the requester.

### Communes

`GET /api/communes?q=` (public, `publicReads` limiter): `q` trimmed, 2–60 characters. A
5-character INSEE code returns that commune; otherwise an accent- and case-insensitive name
prefix match, exact name first then French alphabetical order, at most 20
`{communes: [{code, name}]}`. Used by the event city picker.

## Errors and limits

`400` invalid input (`field`, and a password `hint` when relevant), `401` not signed in,
`403` forbidden or bad CSRF/Origin, `404` not a member or unknown resource, `409` state
conflict, `410` invalid link, `415` non-JSON body, `429` rate limit with `Retry-After`,
`422` business rule refused, `503` dependency unavailable. Rate limits are process-local
(single instance assumed); event writes and public event reads are also limited to 600 per
15 minutes per IP (two separate counters).

Error bodies are `{message}` for brick D routes and `{message, code, details?}` for brick B
routes: `code` is a stable upper-case identifier, `details` structured data. A malformed
brick B request envelope (missing `baseVersion`, `confirm`, unknown status filter) answers
`400 INVALID_REQUEST` with `details.field`; field-level refusals use `UNKNOWN_FIELD` or
`INVALID_FIELD` with `details.field`. Every write re-checks membership under lock, so a member
removed meanwhile gets `404`.

## Email delivery

Emails go to an outbox table. Until T11a delivers a real transport, only a development log
transport exists and production start is refused.

## Data at rest

Request and response formats are unchanged. Personal values (account and invitation emails,
pending email, display name, association contact email, outbox recipient and payload) are
stored as AES-256-GCM envelopes, with HMAC blind indexes for email lookups and uniqueness
([spec](architecture/specs/db-encryption-at-rest.md), ADR-0004). Emails are still compared
case-insensitively (`foldEmail`).

## Verification commands

From `server/`: `npm run migrate`, `npm test -- --runInBand`, `npm run test:integration`
(needs Docker), `npm run maintenance`, `npm run reencrypt` (key rotation). Every command needs
`FIELD_KEYRING_FILE_<suffix>` ([configuration](CONFIGURATION.md)), except the test suites.
