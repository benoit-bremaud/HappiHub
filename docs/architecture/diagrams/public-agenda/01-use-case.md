# Use case diagram — public-agenda — what a visitor does without an account

> **Source spec**: [public agenda](../../specs/public-agenda.md) § 2

Status: validated by Benoît on 2026-10-26.

```mermaid
flowchart LR
  V([Visitor])
  subgraph Agenda["HappiHub public agenda"]
    UC21((UC21 Browse upcoming events))
    UC21a((UC21a Narrow by type or city))
    UC22((UC22 View an event page))
  end
  V --> UC21
  V --> UC22
  UC21a -. extend .-> UC21
```

A signed-in account is a visitor too for these goals; no use case needs a session.
