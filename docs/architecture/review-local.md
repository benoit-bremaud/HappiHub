# Local review — HappiHub (docs/v1-component)

- Date: 2026-10-15
- Commit: 4ea325c
- Scope: branch diff origin/docs/v1-use-cases...HEAD (03-component.{puml,svg,md})
- Checks run: design · docs · tests (n/a, docs only) · security · correctness
- Verdict: fix Must Have first · Must 2 · Should 5 · Nice 3
- Resolution: all Must, Should and Nice items applied on 2026-10-15 (owner chose to align 02d); the notation suggestion stays Disagree.

## 🔴 Must Have
- `docs/architecture/diagrams/v1-events/03-component.puml:15` `[design|docs]` · Auth has no session-store dependency although ADR-0001 stores sessions in the data store · add a "Session store adapter (ADR-0001)" from AUTH to the data store.
- `docs/architecture/diagrams/v1-events/03-component.md:33` `[docs]` · "job lock" attributed to ADR-0001 consequences, which cover rate limits only · cite 02d for the lock.

## 🟡 Should Have
- `docs/architecture/diagrams/v1-events/02d-sequence-scheduled-job.puml:13` `[design]` · CP3 says the job deletes images through FileStore; 02d has no FileStore step · add the step (images first, then data, so a crash never orphans files).
- `docs/architecture/diagrams/v1-events/02d-sequence-scheduled-job.puml:5` `[design]` · "Scheduler" participant vs CP1 internal timer · rename to "Internal timer (runOnce)".
- `docs/architecture/diagrams/v1-events/03-component.puml:11` `[design|security]` · per-client-IP and per-key limits (02c) not located · annotate Nginx/API modules.
- `docs/architecture/diagrams/v1-events/03-component.puml:11` `[docs|security]` · TLS edge of ADR-0002 missing from the trust chain · add the TLS edge node.
- `docs/architecture/diagrams/v1-events/03-component.md:6` `[docs]` · ADRs not linked · link both decision files.

## 🔵 Nice to Have
- `docs/architecture/diagrams/v1-events/03-component.puml:67` `[design]` · Outbox port used for both domain write and worker drain · one-line note.
- `docs/architecture/diagrams/v1-events/02d-sequence-scheduled-job.puml:9` `[design]` · job writes "to Data store" directly while 03 shows it going through the domain · treat 02d's data store as the Repositories port (note).
- `docs/architecture/diagrams/v1-events/03-component.md:36` `[docs]` · long heading · shorten.

## ⚪ Disagree / Intentional
- `docs/architecture/diagrams/v1-events/03-component.puml:27` `[design]` · lollipop/socket notation suggested · realization arrows are valid UML 2 and match the package style.

## Per-dimension summary
- Design: no over-engineering, no dependency-rule breach; consistency gaps with 02d. · Docs: template conforms, two accuracy fixes. · Tests: n/a (no code). · Security: trust chain and rate-limit placement should be explicit. · Correctness: no broken links.
