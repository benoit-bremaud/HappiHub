# HappiHub API contract

Current contract after brick D (accounts and associations on PostgreSQL). Source of truth for
behavior: [brick D specification](architecture/specs/v1-brick-d-accounts-associations.md).
Historical FAQ/GUIDE/tutorials do not define current behavior.

## Authentication and transport

- Browser sessions use an HttpOnly cookie stored in PostgreSQL (`connect-pg-simple`, ADR-0001):
  idle expiry 30 min, absolute cap 8 h. No bearer token is accepted.
- `GET /api/session` returns `{ account | null, csrfToken }`. Every write sends the token in
  `X-CSRF-Token` and must come from the exact configured Origin, otherwise `403`.
- A write with a body must be `application/json`, otherwise `415`. Bodiless writes are allowed.
- Every response carries `Cache-Control: no-store` and `Referrer-Policy: no-referrer`.
- Email links carry their token in the URL fragment; the client sends it in a JSON body only.
  Only a SHA-256 hash of each token is stored.

## Endpoints (prefix `/api`)

| Method and path | Use case | Success | Notes |
|---|---|---|---|
| `GET /session` | — | 200 | Bootstrap; anonymous or signed-in |
| `POST /session` | sign in | 200 | Neutral `401` for unknown email or wrong password; rate-limited |
| `DELETE /session` | sign out | 204 | |
| `POST /signup` | UC1 | 202 | `{email, password, associationName?}`; same answer whether or not the email exists, no session opened (N1). Without `associationName` it is an invitee sign-up (UC11 3a, amendment A-D1) |
| `POST /email-verification` | UC2 | 200 | `{token}`; a sign-up verification opens a session and returns `invitations` to join (UC11 4c) |
| `POST /email-verification/resend` | UC2 | 202 | `{email}`; neutral |
| `POST /password-reset` | UC3 | 202 | `{email}`; neutral |
| `POST /password-reset/confirm` | UC3 | 200 | `{token, password}`; revokes every other session |
| `GET /account` | UC4 | 200 | Includes memberships and `soleMemberOf` |
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
| `/events`, `/comments` | — | 503 | Legacy routes disabled until bricks B/C (S3) |

## Errors and limits

`400` invalid input (`field`, and a password `hint` when relevant), `401` not signed in,
`403` forbidden or bad CSRF/Origin, `404` not a member or unknown resource, `409` state
conflict, `410` invalid link, `415` non-JSON body, `429` rate limit with `Retry-After`,
`503` dependency unavailable. Rate limits are process-local (single instance assumed).

## Email delivery

Emails go to an outbox table. Until T11a delivers a real transport, only a development log
transport exists and production start is refused.

## Verification commands

From `server/`: `npm run migrate`, `npm test -- --runInBand`, `npm run test:integration`
(needs Docker), `npm run maintenance`.
