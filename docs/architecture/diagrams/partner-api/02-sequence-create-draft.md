# Sequence diagram — partner-api — Create a draft with idempotency, then edit it

> **Source spec**: [partner API](../../specs/partner-api.md) § 4, UC34, UC35

Status: validated by Benoît on 2026-10-24 (review-local corrections M1–M3 included).

Question answered: how does a retried creation stay single, and how do key and member edits meet?

```mermaid
sequenceDiagram
  autonumber
  participant P as Partner server
  participant R as /api/v1 router
  participant K as apiKeyAuth
  participant E as events service (brick B)
  participant DB as PostgreSQL

  P->>R: POST /api/v1/drafts<br/>Authorization: Bearer hh_live_id_secret<br/>Idempotency-Key: k1, body
  R->>R: per-IP limit (before lookup)
  R->>K: authenticate
  K->>DB: SELECT api_key + association status by id
  K->>K: constant-time compare SHA-256(secret)<br/>(dummy hash when id unknown)
  break unknown, revoked or wrong secret
    K-->>P: 401 API_KEY_INVALID
  end
  break key cannot write
    K-->>P: 403 SCOPE_REQUIRED
  end
  break association suspended or closed
    K-->>P: 403 ASSOCIATION_UNAVAILABLE
  end
  break Idempotency-Key header missing
    R-->>P: 400 IDEMPOTENCY_KEY_REQUIRED
  end
  R->>R: per-key write limit
  R->>E: createDraft(associationId, fields, actor = key, k1, sha256(body))
  E->>DB: BEGIN
  E->>DB: SELECT api_key, association FOR SHARE (R11)
  break key revoked or association unavailable since authentication
    E->>DB: ROLLBACK
    E-->>P: 401 API_KEY_INVALID or 403 ASSOCIATION_UNAVAILABLE
  end
  E->>DB: INSERT api_idempotency (key, k1, hash) ON CONFLICT DO NOTHING
  Note right of DB: a concurrent duplicate waits here<br/>until the first transaction ends
  alt row already committed, same hash
    E->>DB: ROLLBACK
    E-->>P: 201 stored body (no new draft)
  else row already committed, other hash
    E->>DB: ROLLBACK
    E-->>P: 422 IDEMPOTENCY_KEY_REUSED
  else new row
    E->>DB: quotas (association 20 / 24 h, key 10 / 24 h), field validation
    E->>DB: INSERT event (DRAFT, created_by_api_key_id)
    E->>DB: UPDATE api_idempotency SET response body
    E->>DB: INSERT activity_entry EVENT_CREATED_BY_KEY
    E->>DB: COMMIT
    E-->>P: 201 Location: /api/v1/drafts/:id
  end
  Note over P,DB: validation (400), quota or limit (429) and any error roll back<br/>both rows: nothing is stored, the same k1 can be retried (§ 4 error table)

  Note over P,DB: later, a member edits the same draft in HappiHub (version 2)

  P->>R: PATCH /api/v1/drafts/:id {baseVersion 1, changes, base}
  R->>K: authenticate, scope, association (as above)
  R->>R: per-key write limit
  R->>E: mergeEdit(id, actor = key)
  E->>DB: BEGIN, then recheck key and association FOR SHARE (R11)
  E->>DB: SELECT event FOR UPDATE WHERE id AND created_by_api_key_id = key
  alt not found (other key, member event, other association, deleted)
    E-->>P: 404 EVENT_NOT_FOUND
  else status is no longer DRAFT
    E-->>P: 409 DRAFT_PUBLISHED {status}
  else same field changed by the member to another value
    E-->>P: 409 EDIT_CONFLICT {conflicts, lastEditedBy: {kind: MEMBER}, version 2}
  else disjoint fields, or values already equal (R9)
    E->>DB: UPDATE event, version 3, last_edited_by_api_key_id = key, last_edited_by = null
    E-->>P: 200 event {version 3}
  end
```

## Notes

- Writing the idempotency row in the event transaction (M1) means no "in progress" state exists:
  a crash before commit leaves nothing, a crash after commit leaves a replayable 201.
- `lastUsedAt` update (at most hourly) is omitted for readability (see v1 02c).
