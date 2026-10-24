# Component diagram — test-environment — seed placement and dependencies

> **Source spec**: [test environment](../../specs/test-environment.md) § 2, § 7, § 9

Status: validated by Benoît on 2026-10-24.

Question answered: where does the seed live, what does it reuse, and does the dependency
rule hold?

```mermaid
flowchart TB
  subgraph jobs["jobs/"]
    SEED[seedDemo job<br/>guard, upsert, report]
  end
  subgraph data["scripts/demo/ (data only)"]
    DS[dataset definition<br/>personas, associations, events]
  end
  subgraph config["config/"]
    AC[appConfig tier suffix]
    KL[fieldKeyring DEV]
  end
  subgraph services["services/"]
    SVC[accounts, associations,<br/>invitations, events, outbox]
  end
  FC[domain/fieldCipher]
  FILE[(.demo-credentials.local.json<br/>ignored, 0600)]
  DB[(PostgreSQL *_demo)]
  subgraph tests["tests/integration/"]
    CAT[rejection catalogue<br/>table-driven tests]
    H[harness + disposable DB]
  end
  SEED --> AC
  SEED --> KL
  SEED --> DS
  SEED --> SVC
  SEED --> FILE
  SVC --> FC
  SVC --> DB
  CAT --> H
```

The seed and the tests share no runtime code path: tests never read the demo dataset or
the demo database.
