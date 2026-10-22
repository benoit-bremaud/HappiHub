# Component diagram — v1-event-client

> **Source spec**: [client event workflow](../../specs/v1-brick-b-client-event-workflow.md) § 5

Status: validated by Benoît on 2026-10-22.

```mermaid
flowchart LR
  subgraph client/src/events
    L[EventListPage] --> S
    Ed[EventEditorPage] --> U[useEventEditor]
    Ed --> P[EventPoster]
    Ed --> C[ConflictPanel]
    Ed --> D[ConfirmDialog]
    Ed --> CP[CityPicker]
    Pub[PublicEventPage] --> P
    Pub --> S
    U --> F[eventFields.js pure]
    Ed --> F
    U --> S
    CP --> S
  end
  S[accounts/request.js send] --> A[api.js apiFetch + CSRF]
  U --> Ses[session.js]
  A --> API[(HappiHub API /api)]
```

`eventFields.js` has no imports; screens never call `apiFetch` directly.
