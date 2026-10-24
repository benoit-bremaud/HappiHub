# Class diagram — partner-api — Data delta on the V1 model

> **Source spec**: [partner API](../../specs/partner-api.md) § 5
> **Base**: [v1 class diagram](../v1-events/04-class.md) (`ApiKey`, `Event`, `ActivityEntry`)

Status: proposed, awaiting Benoît's validation.

Question answered: which attributes and associations are added for scopes, key attribution and
idempotency?

```mermaid
classDiagram
  class Association
  class Account
  class ApiKey {
    name
    secretHash
    scopes : Scope[1..2]
    createdAt
    lastUsedAt [0..1]
    revokedAt [0..1]
    revocationNoticeAt [0..1]
  }
  class Scope {
    <<enumeration>>
    EVENTS_READ
    EVENTS_WRITE
  }
  class Event {
    status
    version
  }
  class IdempotencyRecord {
    idempotencyKey
    requestHash
    responseStatus [0..1]
    responseBody [0..1]
    createdAt
  }
  Association "1" *-- "0..5" ApiKey : active keys
  ApiKey "0..*" --> "0..1" Account : createdBy
  ApiKey ..> Scope
  Event "0..*" --> "0..1" Account : createdBy
  Event "0..*" --> "0..1" ApiKey : createdByKey «new»
  Event "0..*" --> "0..1" ApiKey : lastEditedByKey «new»
  ApiKey "1" *-- "0..*" IdempotencyRecord «new»
```

## Constraints

- `scopes` always contains `EVENTS_READ`; it is fixed at creation (R1).
- An event has `createdBy` or `createdByKey`, never both (R4).
- A key reaches an event through `createdByKey` only while the event is a `DRAFT` (D4, R6).
- `IdempotencyRecord` lives 24 h; `responseStatus` null means "in progress".
