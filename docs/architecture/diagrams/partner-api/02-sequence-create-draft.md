# Sequence diagram — partner-api — Create a draft with idempotency, then edit it

> **Source spec**: [partner API](../../specs/partner-api.md) § 4, UC34, UC35

Status: proposed, awaiting Benoît's validation.

Question answered: how does a retried creation stay single, and how do key and member edits meet?

```mermaid
sequenceDiagram
  autonumber
  participant P as Partner server
  participant R as /api/v1 router
  participant K as apiKeyAuth
  participant I as idempotency
  participant E as events service (brick B)
  participant DB as PostgreSQL

  P->>R: POST /v1/events<br/>Authorization: Bearer hh_live_id_secret<br/>Idempotency-Key: k1, body
  R->>R: per-IP limit (before lookup)
  R->>K: authenticate
  K->>DB: SELECT api_key by id
  K->>K: constant-time compare SHA-256(secret)
  alt unknown, revoked or wrong secret
    K-->>P: 401 API_KEY_INVALID
  else key lacks events:write
    K-->>P: 403 SCOPE_REQUIRED
  end
  K->>R: key {id, associationId, scopes}
  R->>R: per-key write limit
  R->>I: begin(keyId, k1, sha256(body))
  I->>DB: INSERT api_idempotency ON CONFLICT DO NOTHING
  alt row exists, same hash, completed
    I-->>P: stored status and body (no new draft)
  else row exists, other hash
    I-->>P: 422 IDEMPOTENCY_KEY_REUSED
  else row exists, in progress
    I-->>P: 409 IDEMPOTENCY_IN_PROGRESS
  end
  R->>E: createDraft(associationId, fields, actor = key)
  E->>DB: BEGIN; association active?; quota (20 / 24 h)
  E->>DB: INSERT event (DRAFT, created_by_api_key_id)
  E->>DB: INSERT activity_entry EVENT_CREATED_BY_KEY; COMMIT
  E-->>R: event {id, version 1}
  R->>I: complete(keyId, k1, 201, body)
  R-->>P: 201 Location: /api/v1/drafts/{id}

  Note over P,DB: later, a member edits the same draft in HappiHub (version 2)

  P->>R: PATCH /v1/drafts/{id} {baseVersion 1, changes, base}
  R->>K: authenticate + scope (as above)
  R->>E: mergeEdit(id, actor = key)
  E->>DB: SELECT event FOR UPDATE WHERE created_by_api_key_id = key AND status = DRAFT
  alt not found (other key, member draft, other association)
    E-->>P: 404 EVENT_NOT_FOUND
  else published meanwhile
    E-->>P: 409 EVENT_READ_ONLY
  else same field changed by the member
    E-->>P: 409 EDIT_CONFLICT {conflicts, lastEditedBy, version 2}
  else disjoint fields
    E->>DB: UPDATE event, version 3, last_edited_by_api_key_id
    E-->>P: 200 event {version 3}
  end
```

## Notes

- A 5xx after `begin` deletes the idempotency row so the partner can retry safely.
- The idempotency row is written in its own short transaction before the event transaction, so
  a concurrent duplicate sees "in progress" instead of waiting on a lock.
- `lastUsedAt` update (at most hourly) is omitted for readability (see v1 02c).
