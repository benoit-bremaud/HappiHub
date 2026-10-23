# Data-flow diagram — db-encryption — Where personal data is clear or encrypted

> **Source spec**: [encryption at rest](../../specs/db-encryption-at-rest.md) § 2–3, § 9
> **Related**: [V1 data flow 06](../v1-events/06-data-flow.md)

Status: proposed, awaiting Benoît's validation.

Question answered: at which trust boundary is each personal value clear, and which key protects it?

```mermaid
flowchart LR
  B[Browser] -- "HTTPS (ingress)" --> API
  subgraph Host["API host (trust boundary: process memory holds keys)"]
    API[Express services<br/>plaintext in memory]
    FC[fieldCipher<br/>AES-256-GCM + HMAC]
    KR[(Keyring file 0400<br/>outside repo and DB)]
    API --> FC
    KR -. loaded at boot .-> FC
  end
  FC -- "hh1 envelopes + bidx<br/>TLS verify-full or loopback (L2)" --> PG
  subgraph DB["PostgreSQL (sees ciphertext only for personal columns)"]
    PG[(Tables<br/>account, invitation, outbox,<br/>association contact)]
    S[(session: no PII)]
    E[(event: public content, clear)]
  end
  PG -- "data dir + WAL" --> V[(Encrypted volume L1)]
  PG -- "pg_dump" --> BK[(Backup encrypted with age, off-host)]
  KR -. "separate copy" .-> PM[Owner password manager]
  API -- "decrypted message" --> MX[Email transport]
```

Notes: the keyring copy and the backups never travel together; T6 (full host compromise) is
outside what this layer protects.
