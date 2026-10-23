# State diagram — db-encryption — Encryption key lifecycle and rotation

> **Source spec**: [encryption at rest](../../specs/db-encryption-at-rest.md) § 6.2

Status: proposed; decisions validated 2026-10-23, final conception validation pending.

Question answered: when may a key encrypt, decrypt, or be removed?

```mermaid
stateDiagram-v2
  [*] --> Generated: 32 random bytes, kid assigned,<br/>copy in password manager
  Generated --> Active: set as "active" in keyring, restart
  Active --> Retiring: a newer key becomes active
  Retiring --> Retiring: reencrypt job batch<br/>(rows with this kid remain)
  Retiring --> Retired: job reports 0 envelopes with this kid
  Retired --> [*]: removed from keyring and password manager
  Active --> Compromised: suspected leak
  Retiring --> Compromised: suspected leak
  Compromised --> Retiring: emergency rotation (new key active at once)
```

Rules: only `Active` encrypts; `Active` and `Retiring` decrypt; removing a key while envelopes
still carry its kid is refused by the job's zero-count check (AC5). The blind-index key follows
its own exceptional procedure (spec § 6.3).
