# Brick B QA — API flow on the running server

Date: 2026-10-19T08:01:01.724Z. Server: `npm start` on a disposable PostgreSQL 17.6, migrations applied by `npm run migrate`. Accounts are synthetic. Set-up calls (sign-up, verification, invitation) are omitted; every event call is shown.

## 1. Create a draft (UC15)

### Claire: POST /api/associations/troupe-qa/events

Request:

```json
{
  "title": "Concert de printemps",
  "type": "CONCERT"
}
```

Response 201:

```json
{
  "id": "f85dc015-1749-4b2b-ba55-f14978d136f4",
  "status": "DRAFT",
  "title": "Concert de printemps",
  "type": "CONCERT",
  "shortDescription": null,
  "longDescription": null,
  "startsAt": null,
  "endsAt": null,
  "ended": false,
  "venueLabel": null,
  "venueAddress": null,
  "venueCity": null,
  "priceKind": "FREE",
  "priceAmountCents": null,
  "posterStyle": "classic",
  "cancellationReason": null,
  "publishedAt": null,
  "scheduleChangedAt": null,
  "version": 1,
  "lastEditedBy": "Claire",
  "createdAt": "2026-10-19T08:01:18.715Z",
  "updatedAt": "2026-10-19T08:01:18.715Z"
}
```

## 2. Edits from two sessions on different fields merge (UC16 2a)

### Claire: PATCH /api/associations/troupe-qa/events/f85dc015-1749-4b2b-ba55-f14978d136f4

Request:

```json
{
  "baseVersion": 1,
  "changes": {
    "shortDescription": "Chorale et orchestre",
    "startsAt": "2026-11-02T08:01:18.713Z"
  }
}
```

Response 200:

```json
{
  "id": "f85dc015-1749-4b2b-ba55-f14978d136f4",
  "status": "DRAFT",
  "title": "Concert de printemps",
  "type": "CONCERT",
  "shortDescription": "Chorale et orchestre",
  "longDescription": null,
  "startsAt": "2026-11-02T08:01:18.713Z",
  "endsAt": null,
  "ended": false,
  "venueLabel": null,
  "venueAddress": null,
  "venueCity": null,
  "priceKind": "FREE",
  "priceAmountCents": null,
  "posterStyle": "classic",
  "cancellationReason": null,
  "publishedAt": null,
  "scheduleChangedAt": null,
  "version": 2,
  "lastEditedBy": "Claire",
  "createdAt": "2026-10-19T08:01:18.715Z",
  "updatedAt": "2026-10-19T08:01:18.723Z"
}
```

### Malik: PATCH /api/associations/troupe-qa/events/f85dc015-1749-4b2b-ba55-f14978d136f4

Request:

```json
{
  "baseVersion": 1,
  "changes": {
    "venueLabel": "Salle Molière",
    "venueCity": "69123"
  },
  "base": {
    "venueLabel": null,
    "venueCity": null
  }
}
```

Response 200:

```json
{
  "id": "f85dc015-1749-4b2b-ba55-f14978d136f4",
  "status": "DRAFT",
  "title": "Concert de printemps",
  "type": "CONCERT",
  "shortDescription": "Chorale et orchestre",
  "longDescription": null,
  "startsAt": "2026-11-02T08:01:18.713Z",
  "endsAt": null,
  "ended": false,
  "venueLabel": "Salle Molière",
  "venueAddress": null,
  "venueCity": {
    "code": "69123",
    "name": "Lyon"
  },
  "priceKind": "FREE",
  "priceAmountCents": null,
  "posterStyle": "classic",
  "cancellationReason": null,
  "publishedAt": null,
  "scheduleChangedAt": null,
  "version": 3,
  "lastEditedBy": "Malik",
  "createdAt": "2026-10-19T08:01:18.715Z",
  "updatedAt": "2026-10-19T08:01:18.730Z"
}
```

## 3. Same field from a stale version: conflict, nothing written (UC17)

### Claire: PATCH /api/associations/troupe-qa/events/f85dc015-1749-4b2b-ba55-f14978d136f4

Request:

```json
{
  "baseVersion": 2,
  "changes": {
    "venueLabel": "Théâtre des Célestins"
  },
  "base": {
    "venueLabel": null
  }
}
```

Response 409:

```json
{
  "message": "Someone else changed these fields.",
  "code": "EDIT_CONFLICT",
  "details": {
    "conflicts": [
      {
        "field": "venueLabel",
        "yours": "Théâtre des Célestins",
        "theirs": "Salle Molière"
      }
    ],
    "lastEditedBy": "Malik",
    "version": 3
  }
}
```

### Claire: PATCH /api/associations/troupe-qa/events/f85dc015-1749-4b2b-ba55-f14978d136f4

Request:

```json
{
  "baseVersion": 3,
  "changes": {
    "venueLabel": "Théâtre des Célestins"
  }
}
```

Response 200:

```json
{
  "id": "f85dc015-1749-4b2b-ba55-f14978d136f4",
  "status": "DRAFT",
  "title": "Concert de printemps",
  "type": "CONCERT",
  "shortDescription": "Chorale et orchestre",
  "longDescription": null,
  "startsAt": "2026-11-02T08:01:18.713Z",
  "endsAt": null,
  "ended": false,
  "venueLabel": "Théâtre des Célestins",
  "venueAddress": null,
  "venueCity": {
    "code": "69123",
    "name": "Lyon"
  },
  "priceKind": "FREE",
  "priceAmountCents": null,
  "posterStyle": "classic",
  "cancellationReason": null,
  "publishedAt": null,
  "scheduleChangedAt": null,
  "version": 4,
  "lastEditedBy": "Claire",
  "createdAt": "2026-10-19T08:01:18.715Z",
  "updatedAt": "2026-10-19T08:01:18.737Z"
}
```

## 4. Publish (UC18): stale version, then success

### Claire: POST /api/associations/troupe-qa/events/f85dc015-1749-4b2b-ba55-f14978d136f4/publish

Request:

```json
{
  "baseVersion": 3
}
```

Response 409:

```json
{
  "message": "The event changed. Reload it first.",
  "code": "STALE_VERSION",
  "details": {
    "version": 4
  }
}
```

### Claire: POST /api/associations/troupe-qa/events/f85dc015-1749-4b2b-ba55-f14978d136f4/publish

Request:

```json
{
  "baseVersion": 4
}
```

Response 200:

```json
{
  "id": "f85dc015-1749-4b2b-ba55-f14978d136f4",
  "status": "PUBLISHED",
  "title": "Concert de printemps",
  "type": "CONCERT",
  "shortDescription": "Chorale et orchestre",
  "longDescription": null,
  "startsAt": "2026-11-02T08:01:18.713Z",
  "endsAt": null,
  "ended": false,
  "venueLabel": "Théâtre des Célestins",
  "venueAddress": null,
  "venueCity": {
    "code": "69123",
    "name": "Lyon"
  },
  "priceKind": "FREE",
  "priceAmountCents": null,
  "posterStyle": "classic",
  "cancellationReason": null,
  "publishedAt": "2026-10-19T08:01:18.745Z",
  "scheduleChangedAt": null,
  "version": 5,
  "lastEditedBy": "Claire",
  "createdAt": "2026-10-19T08:01:18.715Z",
  "updatedAt": "2026-10-19T08:01:18.745Z"
}
```

## 5. Public read without a session

### Anonymous: GET /api/events/f85dc015-1749-4b2b-ba55-f14978d136f4

Response 200:

```json
{
  "id": "f85dc015-1749-4b2b-ba55-f14978d136f4",
  "status": "PUBLISHED",
  "title": "Concert de printemps",
  "type": "CONCERT",
  "shortDescription": "Chorale et orchestre",
  "longDescription": null,
  "startsAt": "2026-11-02T08:01:18.713Z",
  "endsAt": null,
  "ended": false,
  "venueLabel": "Théâtre des Célestins",
  "venueAddress": null,
  "venueCity": {
    "code": "69123",
    "name": "Lyon"
  },
  "priceKind": "FREE",
  "priceAmountCents": null,
  "posterStyle": "classic",
  "cancellationReason": null,
  "publishedAt": "2026-10-19T08:01:18.745Z",
  "scheduleChangedAt": null,
  "association": {
    "name": "Troupe QA",
    "slug": "troupe-qa"
  }
}
```

### Anonymous: GET /api/events/7d9f2c56-1d6e-4c43-9b55-0a1c2d3e4f5a

Response 404:

```json
{
  "message": "Event not found",
  "code": "EVENT_NOT_FOUND"
}
```

## 6. Cancel (UC19), then every write is refused

### Malik: POST /api/associations/troupe-qa/events/f85dc015-1749-4b2b-ba55-f14978d136f4/cancel

Request:

```json
{
  "baseVersion": 5
}
```

Response 400:

```json
{
  "message": "Invalid request",
  "code": "INVALID_REQUEST",
  "details": {
    "field": "confirm"
  }
}
```

### Malik: POST /api/associations/troupe-qa/events/f85dc015-1749-4b2b-ba55-f14978d136f4/cancel

Request:

```json
{
  "baseVersion": 5,
  "confirm": true,
  "reason": "Salle indisponible"
}
```

Response 200:

```json
{
  "id": "f85dc015-1749-4b2b-ba55-f14978d136f4",
  "status": "CANCELLED",
  "title": "Concert de printemps",
  "type": "CONCERT",
  "shortDescription": "Chorale et orchestre",
  "longDescription": null,
  "startsAt": "2026-11-02T08:01:18.713Z",
  "endsAt": null,
  "ended": false,
  "venueLabel": "Théâtre des Célestins",
  "venueAddress": null,
  "venueCity": {
    "code": "69123",
    "name": "Lyon"
  },
  "priceKind": "FREE",
  "priceAmountCents": null,
  "posterStyle": "classic",
  "cancellationReason": "Salle indisponible",
  "publishedAt": "2026-10-19T08:01:18.745Z",
  "scheduleChangedAt": null,
  "version": 6,
  "lastEditedBy": "Malik",
  "createdAt": "2026-10-19T08:01:18.715Z",
  "updatedAt": "2026-10-19T08:01:18.754Z"
}
```

### Claire: PATCH /api/associations/troupe-qa/events/f85dc015-1749-4b2b-ba55-f14978d136f4

Request:

```json
{
  "baseVersion": 6,
  "changes": {
    "title": "Encore"
  }
}
```

Response 409:

```json
{
  "message": "A cancelled or archived event can no longer change.",
  "code": "EVENT_READ_ONLY"
}
```

### Anonymous: GET /api/events/f85dc015-1749-4b2b-ba55-f14978d136f4

Response 200:

```json
{
  "id": "f85dc015-1749-4b2b-ba55-f14978d136f4",
  "status": "CANCELLED",
  "title": "Concert de printemps",
  "type": "CONCERT",
  "shortDescription": "Chorale et orchestre",
  "longDescription": null,
  "startsAt": "2026-11-02T08:01:18.713Z",
  "endsAt": null,
  "ended": false,
  "venueLabel": "Théâtre des Célestins",
  "venueAddress": null,
  "venueCity": {
    "code": "69123",
    "name": "Lyon"
  },
  "priceKind": "FREE",
  "priceAmountCents": null,
  "posterStyle": "classic",
  "cancellationReason": "Salle indisponible",
  "publishedAt": "2026-10-19T08:01:18.745Z",
  "scheduleChangedAt": null,
  "association": {
    "name": "Troupe QA",
    "slug": "troupe-qa"
  }
}
```

## 7. Member list

### Claire: GET /api/associations/troupe-qa/events

Response 200:

```json
{
  "events": [
    {
      "id": "f85dc015-1749-4b2b-ba55-f14978d136f4",
      "title": "Concert de printemps",
      "type": "CONCERT",
      "status": "CANCELLED",
      "startsAt": "2026-11-02T08:01:18.713Z",
      "ended": false,
      "updatedAt": "2026-10-19T08:01:18.754Z",
      "lastEditedBy": "Malik"
    }
  ]
}
```

