# Sequence — unverified-account purge racing a verification (#328)

Spec: [maintenance-unverified-race](../../specs/maintenance-unverified-race.md), rules R1–R3.

```mermaid
sequenceDiagram
  autonumber
  participant J as Maintenance job
  participant DB as PostgreSQL
  participant V as verifyEmail (UC2)
  J->>DB: SELECT candidates (unverified, age >= 30 d), no lock
  V->>DB: BEGIN; DELETE auth_token (VERIFY) — locks token row
  J->>DB: BEGIN; SELECT auth_token WHERE account_id FOR UPDATE
  Note over J,DB: waits for V's token lock (same order as V: token then account)
  V->>DB: SELECT account FOR UPDATE; UPDATE email_verified_at
  V->>DB: COMMIT
  DB-->>J: lock granted
  J->>DB: SELECT account FOR UPDATE WHERE email_verified_at IS NULL AND created_at <= cutoff
  alt no row (verified meanwhile)
    J->>DB: COMMIT, skip (not counted)
  else still unverified
    J->>DB: deleteAccountRow (UC6 effects); COMMIT; count += 1
  end
  Note over V,J: if J locks first, V's DELETE auth_token finds nothing after J commits → neutral 410
```

The day-23 reminder follows the same pattern, with `verification_reminder_at IS NULL`
added to the recheck.
