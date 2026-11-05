# Sequence — email change racing a verification, before and after (#378)

Spec: [account-token-lock-order](../../specs/account-token-lock-order.md), rules R1–R4.

## Before: opposite orders deadlock

```mermaid
sequenceDiagram
  autonumber
  participant U as updateAccount (UC4)
  participant DB as PostgreSQL
  participant V as verifyEmail (UC2)
  U->>DB: BEGIN; SELECT account FOR UPDATE — holds account
  V->>DB: BEGIN; DELETE auth_token (VERIFY) — holds token row
  V->>DB: SELECT account FOR UPDATE
  Note over V,DB: waits for U
  U->>DB: issueToken: DELETE auth_token (VERIFY)
  Note over U,DB: waits for V — cycle
  DB-->>V: ERROR 40P01, rollback → HTTP 500
```

## After: tokens first everywhere (R1)

```mermaid
sequenceDiagram
  autonumber
  participant U as updateAccount (UC4)
  participant DB as PostgreSQL
  participant V as verifyEmail (UC2)
  V->>DB: BEGIN; DELETE auth_token (VERIFY) — holds token row
  U->>DB: BEGIN; lockAccountTokens (ORDER BY id FOR UPDATE)
  Note over U,DB: waits for V, holds no account lock
  V->>DB: SELECT account FOR UPDATE; UPDATE; COMMIT
  DB-->>U: token lock granted
  U->>DB: SELECT account FOR UPDATE; issueToken; COMMIT
```

`deleteAccount` (UC6) follows the same pattern: `lockAccountTokens`, then `deleteAccountRow`,
whose account lock and cascade come after the tokens lock.
