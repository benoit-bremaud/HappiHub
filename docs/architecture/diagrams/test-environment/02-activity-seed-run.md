# Activity diagram — test-environment — one seed run

> **Source spec**: [test environment](../../specs/test-environment.md) § 2, § 6–8

Status: validated by Benoît on 2026-10-24.

Question answered: in which order does a run check, write and report, and where does it stop?

```mermaid
flowchart TD
  S([npm run seed:demo]) --> G1{NODE_ENV unset or development?}
  G1 -- no --> X([Refuse, exit 1, nothing written])
  G1 -- yes --> G2{DB name ends in _demo and host local?}
  G2 -- no --> X
  G2 -- yes --> G3{"--confirm, no PROD URL, DEV keyring?"}
  G3 -- no --> X
  G3 -- yes --> M{Migrations up to date?}
  M -- no --> X
  M -- yes --> R{--reset?}
  R -- yes --> D[Delete namespace rows only]
  R -- no --> C
  D --> C[Load or generate passwords<br/>credentials file 0600]
  C --> U[Upsert one service call at a time, rerun completes a partial run<br/>accounts → associations → memberships<br/>→ invitations → events → activity/outbox<br/>through services and fieldCipher, injectable clock]
  U --> J[Run maintenance job with the seed clock<br/>archive, cleanup notice; SQL hidden flag E19]
  J --> V
  V[Verify: envelope stored, counts]
  V --> E([Report created / unchanged, exit 0])
```
