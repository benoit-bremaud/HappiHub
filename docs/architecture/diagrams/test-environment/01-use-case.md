# Use case diagram — test-environment — who uses the demo environment

> **Source spec**: [test environment](../../specs/test-environment.md) § 1, § 3

Status: validated by Benoît on 2026-10-24.

Question answered: which actor-initiated goals does the test environment serve?

```mermaid
flowchart LR
  DEV([Developer])
  QA([Tester / owner])
  CI([CI pipeline])
  subgraph Demo["Demo environment"]
    UC1((Seed the demo database))
    UC2((Reset the demo namespace))
    UC3((Sign in as a persona))
    UC4((Run a persona scenario))
    UC5((Check a rejection case by hand))
  end
  subgraph Tests["Automated tests"]
    UC6((Run the rejection catalogue))
  end
  DEV --> UC1
  DEV --> UC2
  QA --> UC3
  QA --> UC4
  QA --> UC5
  UC4 -. include .-> UC3
  CI --> UC6
```

Use cases are goals of the actor who starts them; the seed guard and encryption are
system behaviour inside UC1, not use cases.
