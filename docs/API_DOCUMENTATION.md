# HappiHub API contract

This documents the current local security branch, not a deployed release. The API is JSON under `/api`. Tests exercise Express and Mongoose against a disposable MongoDB process; deployment and browser E2E behavior are separate concerns.

## Authentication and visibility

Protected endpoints use server-managed MongoDB sessions and an HttpOnly cookie. Legacy bearer JWTs are no longer accepted. Each protected request reloads the account's current role and authentication version. Deleted accounts and revoked sessions cannot authenticate.

First call `GET /users/session` with the exact configured Origin (or a matching browser Referer). It returns `{ user, csrfToken }`, creating a short-lived anonymous session when needed. Send its cookie using browser credentials and the in-memory `X-CSRF-Token` on every POST/PUT/PATCH/DELETE, including signup, login and logout. Writes require JSON and exact Origin, with exact Referer-origin fallback. Responses under /api use `Cache-Control: no-store`.

Login regenerates both the identifier and CSRF token. Logout destroys the stored session and clears the cookie. Authenticated sessions expire after 30 minutes of inactivity or eight hours total. Anonymous bootstrap sessions expire after 30 minutes without extending their absolute deadline. Mongo TTL cleanup is not the authority check. Optional reads treat expired visits as anonymous without granting owner access.

Local HTTP cookies use `happihub.sid`. Production uses `__Host-happihub.sid`, Secure, HttpOnly, SameSite=Lax, Path=/ and no Domain, behind a verified HTTPS entry point.

An event is public only when `isPrivate` is false and `status` is `approved`. Owners can read their own events in any current moderation state. Other private, pending or rejected event reads return 404. This rule also protects associated comments. There is no administrator visibility exception in the current event policy.

## Implemented endpoints

| Method | Path under /api | Authentication | Success |
| --- | --- | --- | --- |
| GET | /users/session | Public bootstrap | 200 user and CSRF token |
| POST | /users/logout | Session + CSRF | 204 revoked session |
| POST | /users/signup | Anonymous session + CSRF | 201 registration message |
| POST | /users/login | Anonymous session + CSRF | 200 projected user and new CSRF token |
| GET | /users/profile | Required | 200 projected user wrapper |
| PUT | /users/profile | Required | 200 projected user |
| GET | /users/role | Required | 200 current role |
| POST | /events | Required | 201 projected event |
| GET | /events | Required | 200 readable event array |
| GET | /events/public | None | 200 approved public event array |
| GET | /events/:id | Optional | 200 projected readable event |
| PATCH | /events/:id | Required | 200 participation message |
| POST | /comments/add | Required | 201 projected created comment |
| GET | /comments/events/:event_id/comments | Optional | 200 projected comment array |

`GET /test`, outside `/api`, returns a text liveness message. It is not a database readiness check. `GET /ready` returns `{ "ready": true }` with 200 for an established Mongoose connection, otherwise `{ "ready": false }` with 503. This reports connection state, not a transactional database probe.

## User contracts

### Registration

Required fields: `name` (3–100 characters), `email` (valid address, 6–254 characters), and `password` (6–72 characters and at most 72 UTF-8 bytes). Unknown fields are rejected. `role` may be omitted or `user`; `admin` is rejected. The compatibility `rank` field accepts the existing capitalized rank values but is not persisted by this endpoint; the model default applies. Role and rank policy require future conception review.

```json
{
  "name": "Example organizer",
  "email": "organizer@example.com",
  "password": "EXAMPLE_PASSWORD_ONLY"
}
```

The password is hashed by the Mongoose save hook. Success returns only:

```json
{"message":"User registered successfully"}
```

Invalid input returns 400. An existing email returns 400 with `Unable to register`. Persistence failures return a generic 500; simultaneous duplicate signup may reach this path through the unique index.

### Login

Send `email` and `password` only. The same email/password limits apply. Invalid request shape returns 400. Unknown accounts or incorrect passwords return 401 with `Invalid credentials`. Successful login returns:

```json
{
  "user": { "_id": "000000000000000000000001", "name": "Example organizer", "email": "organizer@example.com", "role": "user" },
  "csrfToken": "<SESSION_BOUND_CSRF_TOKEN>"
}
```

The identifier is sent in Set-Cookie and is absent from JSON. Persistence failure returns 503.

### Profile and role

`GET /users/profile` returns `{ "user": { "_id", "name", "email", "role" } }`. `PUT /users/profile` returns that projected user directly, without the wrapper. Password hashes and internal permissions are never part of those response contracts.

Profile changes accept one or more of `name`, `email`, and `password`. Name and password limits match registration; email must be valid and at most 254 characters. Omit `password` when unchanged; an empty password is invalid. Role changes and other unknown fields are rejected. Password changes explicitly hash the replacement before the atomic password/version update. Database conflicts currently return a generic 500, not a dedicated conflict response.

`GET /users/role` returns `{ "role": "user" }` or the account's current stored role.

## Event contracts

### Creation

Required fields: `title` (3–200 characters), `description` (6–20,000), `date` (Joi-convertible date), and `location` (3–500). Optional persisted fields: `image` and `isPrivate` (boolean, false by default). `creator` is assigned from authentication. Omit it; a differing supplied creator returns 403.

```json
{
  "title": "Example workshop",
  "description": "An illustrative workshop description.",
  "date": "2030-01-01T10:00:00.000Z",
  "location": "Example venue",
  "isPrivate": true
}
```

New events default to `pending`. There is no approval endpoint, automatic approval, draft editor lifecycle or event update endpoint in this increment. Event titles currently have a database-wide unique index. Duplicate-title writes return a generic 500. Scheduling/timezone semantics and title uniqueness require future product decisions.

For legacy compatibility, validation accepts `attendees`, structured `comments`, `likes`, `dislikes`, and `report` arrays, but creation does not persist them. Do not rely on these fields to mutate relationships or moderation. Unknown fields, including a requested `status`, are rejected.

Images may be null/empty, HTTPS URLs without embedded credentials, or base64 PNG/JPEG/WebP data. Inline images are limited to 2 MiB decoded and checked for format signatures. This is not full decoding, dimension checking or malware scanning. Remote URLs are not fetched or content-verified by the server; browsers may contact their host.

### Reads

Projected event fields are `_id`, `title`, `description`, `date`, `location`, `image`, `isPrivate`, and `status`. Optional fields may be absent. Dates serialize as ISO strings. Creator, attendee and comment identifiers are excluded.

Authenticated listing returns owned events plus approved public events. Anonymous listing returns only approved public events. Detail reads apply the same visibility policy. IDs must be 24 hexadecimal characters. Invalid IDs return 400; missing or unauthorized events return 404. Lists are currently unpaginated and have no guaranteed ordering.

### Participation

`PATCH /events/:id` joins the authenticated account to a readable event. An empty JSON object is sufficient. The legacy `userId` may be omitted or equal the authenticated ID; another ID returns 403. Other fields currently have no participation effect. Duplicate participation is idempotent through atomic `$addToSet`.

Success returns `{ "message": "Participation saved" }`. This does not edit event content. There is no withdrawal endpoint in the current routes.

## Comment contracts

`POST /comments/add` accepts `content` (1–5,000 characters) and `event_id` (24 hexadecimal characters). Omit `user_id`: identity comes from authentication. A differing legacy supplied author returns 403. Unknown fields are rejected. The event must be readable by the account.

Created comment response fields: `_id`, `content`, `event_id`. Listing fields: `_id`, `content`, `createdAt`, `updatedAt`. Author data is deliberately absent; clients must not access `user_id.name`. Comment attribution remains a product decision. Lists are unpaginated and unsorted.

## Errors and limits

Errors use `{ "message": "..." }`, without stack traces or database internals. Principal statuses are 400 invalid input, 401 missing/invalid authentication, 403 rejected CSRF/origin or forged identity, 415 non-JSON write, 429 rate limit, 404 missing/unreadable resource, 413 oversized request, 500 internal failure, and 503 unavailable authentication infrastructure.

JSON request bodies have a 10 MiB limit. Write endpoints reject other content types with 415. Image limits are narrower. The configured CORS origin is not an authorization mechanism. Bootstrap is limited to 120 requests per IP per 15 minutes and login to 20 per IP per 15 minutes, with 429 and Retry-After. Counters are process-local and reset on restart; multiple replicas require a shared limiter before deployment. Security headers and broader deployment hardening remain outstanding.

## Absent capabilities

Server logout and session bootstrap are implemented. There is no JWT refresh route. Event editing, deletion, approval, comment editing/deletion, ticketing and booking are not implemented routes. Older examples describing these capabilities were inaccurate.

## Verification commands

From `server/`, run `npm test -- --runInBand` for fast tests and `npm run test:integration` for real database tests. The integration suite pins MongoDB 7.0.40, binds loopback, obtains its URI from its own disposable process, initializes indexes, resets synthetic collections, disconnects and stops the process. It never reads existing MongoDB URIs. First run may download the pinned binary and verify its archive checksum.

A standalone test process does not validate production topology, database credentials, TLS, backups, replica-set transactions or browser E2E behavior. MongoDB is the current implementation and will be reassessed during the future conception study.

## Password changes

PUT /users/profile accepts name/email changes as before. When password is supplied,
currentPassword is required and verified. The password hash and authentication version
change atomically, all existing sessions lose authority, and the current cookie is cleared.
The user signs in again. No session/device management UI is included.
