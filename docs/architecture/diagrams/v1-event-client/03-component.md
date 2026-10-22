# Component diagram — v1-event-client

> **Source spec**: [client event workflow](../../specs/v1-brick-b-client-event-workflow.md) § 5

Status: validated by Benoît on 2026-10-22; progressive-disclosure split (EventSteps, StepPreview, InPlaceSignIn) amended the same day, to revalidate.

```mermaid
flowchart LR
  subgraph client/src/events
    L[EventListPage] --> S
    Ed[EventEditorPage] --> U[useEventEditor]
    Ed --> P[EventPoster]
    Ed --> C[ConflictPanel]
    Ed --> D[ConfirmDialog]
    Ed --> St[EventSteps]
    Ed --> SP[StepPreview]
    Ed --> IS[InPlaceSignIn]
    St --> CP[CityPicker]
    SP --> D
    SP --> P
    IS --> S
    SP --> S
    Pub[PublicEventPage] --> P
    Pub --> S
    U --> F[eventFields.js pure]
    Ed --> F
    U --> S
    CP --> S
  end
  S[accounts/request.js send] --> A[api.js apiFetch + CSRF]
  Ed --> Ses[session.js refresh]
  Ses -. refreshSession callback .-> U
  A --> API[(HappiHub API /api)]
```

`eventFields.js` has no imports; screens never call `apiFetch` directly.
