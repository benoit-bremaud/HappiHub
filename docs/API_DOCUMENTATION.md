# HappiHub API contract

This documents the current local security branch, not a deployed release. The API is JSON under `/api`. Tests exercise Express and Mongoose against a disposable MongoDB process; deployment and browser E2E behavior are separate concerns.

## Authentication and visibility

Protected endpoints require `Authorization: Bearer <access-token>`. Tokens use HS256, contain an account ID and role, and expire according to server configuration. Each protected request also reloads the account: deleted accounts are denied and stale token roles are not authoritative.

Optional-authentication endpoints accept anonymous requests without that header. A supplied invalid or expired credential is rejected with 401 rather than treated as anonymous. `/events/public` is an anonymous read and does not process credentials.

An event is public only when `isPrivate` is false and `status` is `approved`. Owners can read their own events in any current moderation state. Other private, pending or rejected event reads return 404. This rule also protects associated comments. There is no administrator visibility exception in the current event policy.

## Implemented endpoints

| Method | Path under /api | Authentication | Success |
| --- | --- | --- | --- |
| POST | /users/signup | None | 201 registration message |
| POST | /users/login | None | 200 token and projected user |
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

`GET /test`, outside `/api`, returns a text liveness message. It is not a database readiness check.

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
  "message": "Logged in successfully",
  "token": "<ACCESS_TOKEN>",
  "user": {
    "_id": "000000000000000000000001",
    "name": "Example organizer",
    "email": "organizer@example.com",
    "role": "user"
  }
}
```

This is an illustrative response; the token placeholder is not a usable credential.

### Profile and role

`GET /users/profile` returns `{ "user": { "_id", "name", "email", "role" } }`. `PUT /users/profile` returns that projected user directly, without the wrapper. Password hashes and internal permissions are never part of those response contracts.

Profile changes accept one or more of `name`, `email`, and `password`. Name and password limits match registration; email must be valid and at most 254 characters. Omit `password` when unchanged; an empty password is invalid. Role changes and other unknown fields are rejected. Password changes run the hashing hook. Database conflicts currently return a generic 500, not a dedicated conflict response.

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

Errors use `{ "message": "..." }`, without stack traces or database internals. Principal statuses are 400 invalid input, 401 missing/invalid authentication, 403 forged identity, 404 missing/unreadable resource, 413 oversized request, 500 internal failure, and 503 unavailable authentication infrastructure.

JSON and URL-encoded request bodies have a 10 MiB limit. Image limits are narrower. The configured CORS origin is not an authorization mechanism. Rate limiting, session revocation, security headers and broader deployment hardening are outstanding.

## Absent capabilities

There is no server logout or refresh route. Browser logout removes its local token; it does not revoke a copied token. Event editing, deletion, approval, comment editing/deletion, ticketing and booking are not implemented routes. Older examples describing these capabilities were inaccurate.

## Verification commands

From `server/`, run `npm test -- --runInBand` for fast tests and `npm run test:integration` for real database tests. The integration suite pins MongoDB 7.0.40, binds loopback, obtains its URI from its own disposable process, initializes indexes, resets synthetic collections, disconnects and stops the process. It never reads existing MongoDB URIs. First run may download the pinned binary and verify its archive checksum.

A standalone test process does not validate production topology, database credentials, TLS, backups, replica-set transactions or browser E2E behavior. MongoDB is the current implementation and will be reassessed during the future conception study.
