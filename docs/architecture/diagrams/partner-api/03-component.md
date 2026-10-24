# Component diagram — partner-api — Where the partner API sits

> **Source spec**: [partner API](../../specs/partner-api.md) § 4, § 10

Status: validated by Benoît on 2026-10-24.

Question answered: which modules are new, what do they reuse, and does the dependency rule hold?

```mermaid
flowchart TB
  Partner["Partner website server"]
  Browser["Member browser (React client)"]

  subgraph http["HTTP layer (Express)"]
    V1["/api/v1 router «new»<br/>no session, no CORS"]
    KA["apiKeyAuth middleware «new»<br/>Bearer parse, hash compare, scope"]
    RL["rate limiters<br/>per IP · per key"]
    KEYS["/api/associations/:slug/api-keys «new»<br/>session + CSRF (UC27)"]
    APP["existing /api routes<br/>session + CSRF"]
  end

  subgraph services["services/"]
    EVS["events service (brick B)<br/>validation, merge, quota, activity<br/>+ idempotency row in the same transaction «new»"]
    AKS["apiKeys service «new»<br/>create, list, revoke"]
    PUB["public projection (UC22/UC28)"]
  end

  subgraph domain["domain/ (pure)"]
    EVD["event rules (brick B)"]
    KEYD["apiKeySecret «new»<br/>generate, parse, hash"]
  end

  DB[("PostgreSQL<br/>api_key · event · api_idempotency · activity_entry")]
  MJ["maintenance job (02d)<br/>+ idempotency purge, I1 revocation"]

  Partner -- "HTTPS JSON" --> V1
  Browser --> KEYS
  Browser --> APP
  V1 --> RL --> KA --> EVS
  V1 --> PUB
  KEYS --> AKS
  APP --> EVS
  KA --> AKS
  AKS --> KEYD
  EVS --> EVD
  EVS --> DB
  AKS --> DB
  PUB --> DB
  MJ --> DB
```

## Notes

- The write path reuses the brick B events service with an actor that is either a member or a
  key: one validation and merge implementation (DRY), no partner-specific copy.
- `domain/` stays free of Express and `pg` (dependency rule). Key secrets use `node:crypto` only.
- Key management lives on the session side so a key can never manage keys (threat T8).
