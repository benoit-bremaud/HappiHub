# Component diagram — db-encryption — fieldCipher placement and dependencies

> **Source spec**: [encryption at rest](../../specs/db-encryption-at-rest.md) § 6, § 8

Status: validated by Benoît on 2026-10-23.

Question answered: which module owns encryption, who depends on it, and does the dependency
rule hold (domain never imports infrastructure)?

```mermaid
flowchart TB
  subgraph config["config/ (infrastructure)"]
    KL[keyringLoader<br/>reads FIELD_KEYRING_FILE_suffix,<br/>validates, refuses in prod]
    TLS[databaseUrl check<br/>loopback or sslmode=verify-full]
  end
  subgraph domain["domain/ (pure, node:crypto only)"]
    FC["fieldCipher<br/>encrypt(column, value)<br/>decrypt(column, envelope)<br/>blindIndex(value)<br/>needsRotation(envelope)"]
    EM[email.foldEmail]
  end
  subgraph services["services/ and jobs/"]
    ACC[accounts]
    INV[invitations]
    ASS[associations]
    OUT[outbox]
    MNT[maintenance]
    RE[reencrypt job]
  end
  SRV[server.js / runMaintenance.js<br/>composition root] --> KL
  SRV --> TLS
  SRV -- "ctx.cipher" --> services
  KL -- "keyring object" --> FC
  FC --> EM
  ACC --> FC
  INV --> FC
  ASS --> FC
  OUT --> FC
  MNT --> FC
  RE --> FC
```

`fieldCipher` receives the keyring as a value; it reads no file or environment variable, so it
is unit-testable with a throw-away keyring. No repository/ORM layer is added: services already
own their SQL and call the cipher at that boundary (KISS).
