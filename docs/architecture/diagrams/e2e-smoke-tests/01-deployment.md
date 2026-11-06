# Deployment diagram — e2e-smoke-tests — what runs during a local gate run

> **Source spec**: [E2E and smoke tests](../../specs/e2e-smoke-tests.md) § 2

Status: validated by Benoît on 2026-11-06.

Question answered: which processes and containers exist during `npm test` in `e2e/`, and who talks to whom?

```mermaid
flowchart LR
  subgraph Host["Developer machine (loopback only)"]
    PW["Playwright runner<br/>e2e/ (globalSetup, tests)"]
    BR["Chromium headless"]
    SB["Static server :3100<br/>client/build (prod bundle)"]
    API["API :5100<br/>server/ npm start, DEV tier"]
    LOG[("run log<br/>e2e/.run/api.log")]
    subgraph Docker["Docker"]
      PG[("PostgreSQL 17.6<br/>happihub_e2e_demo, tmpfs")]
    end
  end
  PW -->|drives| BR
  PW -->|starts / stops| SB
  PW -->|migrate, seed, start / stop| API
  PW -->|docker run / rm| PG
  BR -->|HTTP GET pages| SB
  BR -->|HTTP /api, cookie + CSRF| API
  API -->|SQL| PG
  API -->|log email transport| LOG
  PW -->|reads verification link| LOG
```
