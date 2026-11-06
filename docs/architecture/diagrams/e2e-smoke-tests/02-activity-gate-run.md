# Activity diagram — e2e-smoke-tests — one gate run

> **Source spec**: [E2E and smoke tests](../../specs/e2e-smoke-tests.md) § 3, § 7, § 10

Status: proposed, awaiting Benoît's validation.

Question answered: in which order does one run prepare, test and clean up, and where does it stop?

```mermaid
flowchart TD
  S([npm test in e2e/]) --> C[Start disposable PostgreSQL]
  C --> K[Generate run keyring and secrets]
  K --> M[Migrate, seed demo data]
  M --> B[Build the production client bundle]
  B --> U[Start API :5100 and static server :3100]
  U --> R{Both answer?}
  R -- no --> T
  R -- yes --> SM[Smoke project S1-S2]
  SM --> OK{Smoke green?}
  OK -- no --> SK[Skip journeys, mark failed] --> T
  OK -- yes --> J[E2E project J-E2E-1..4, one worker]
  J --> T[Teardown: stop processes, remove container and temp files]
  T --> E([Exit 0 if all passed, else non-zero])
```
