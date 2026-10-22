# Sequence diagram — v1-event-client — Editor save, conflict and session expiry

> **Source spec**: [client event workflow](../../specs/v1-brick-b-client-event-workflow.md) § 3–4
> **Related**: [02a server merge](../v1-events/02a-sequence-autosave-conflict.md)

Status: validated by Benoît on 2026-10-22.

```mermaid
sequenceDiagram
  actor M as Member
  participant E as EventEditorPage
  participant H as useEventEditor
  participant API as HappiHub API
  M->>E: edits a field
  E->>H: change(field, value)
  Note over H: base[field] ??= event[field]; status dirty
  H->>H: trigger (debounce 1.5 s / blur / step change)
  alt no event yet (create mode) and title+type valid
    H->>API: POST /associations/{slug}/events {fields}
    API-->>H: 201 {id, version 1}
    H->>E: replace route with /events/{id}
  else existing event, nothing in flight
    H->>API: PATCH …/events/{id} {baseVersion, changes, base}
    alt 200
      API-->>H: event {version+1, lastEditedBy}
      Note over H: drop saved keys from base; status saved
    else 409 EDIT_CONFLICT
      API-->>H: details {conflicts[], lastEditedBy, version}
      H->>E: ConflictPanel yours / theirs
      M->>E: chooses per field
      H->>API: PATCH {baseVersion: details.version, changes: chosen}
      Note over H,API: a new 409 repeats with remaining fields (UC17 3a)
    else 401
      API-->>H: not signed in
      H->>E: in-place sign-in, input kept, no retry
      M->>E: signs in, then "Save now"
    else network / 403 / 5xx
      H->>E: "Not saved — Retry" (403: session.refresh first)
    end
  end
  Note over H: changes made while saving are sent by the next save
