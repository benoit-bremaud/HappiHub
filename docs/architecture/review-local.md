# Local review — HappiHub (docs/v1-data-flow)

- Date: 2026-10-15
- Commit: 95d8743 (base) + working tree
- Scope: branch diff main...docs/v1-data-flow (documentation only)
- Checks run: docs · security/GDPR · correctness (consistency). Design and tests: not
  applicable (no code).
- Verdict: fix Must Have first — all fixed before push · Must 3 · Should 6 · Nice 3 · Disagree 2

## 🔴 Must Have

- `docs/architecture/diagrams/v1-events/06-data-flow.md` DF2 `[docs|correctness]` · "their
  drafts go with them" contradicted UC6/A5 · fixed: association content follows UC8.
- `04-class.puml` Account `[docs]` · day-23 reminder untraceable (K9 precedent) · fixed:
  `Account.verificationReminderAt [0..1]`, owner revalidated.
- `06-data-flow.md` inventory `[security]` · invitee email (third party) missing, retention
  undecided · fixed: DF4 (owner decision, 395/500).

## 🟡 Should Have

- `06-data-flow.md` `[security]` · moderation record retention undecided · fixed: DF5 (400/500).
- `06-data-flow.md` deletion section `[security|correctness]` · cascade incomplete · fixed:
  every 0..1 reference listed with its outcome.
- `06-data-flow.md` API keys `[security]` · wrong legal basis, `name`/`createdBy` missing · fixed.
- `06-data-flow.md` outbox `[security]` · basis ignored non-member recipients · fixed.
- `06-data-flow.puml` `[security]` · API error logs not drawn · fixed: F27, no secrets rule.
- `v1-use-cases.md` UC2/UC6, `06-data-flow.puml` job flows `[docs]` · DF2 and deletion effects
  absent from use cases; job flows incomplete · fixed.

## 🔵 Nice to Have

- `06-data-flow.md:5` `[docs]` · incomplete source list · fixed.
- `06-data-flow.md` `[docs]` · ADR labels · fixed.
- `06-data-flow.md` export `[docs]` · export scope · left to UC5 (already defines it).

## ⚪ Disagree / Intentional

- `06-data-flow.md` sessions `[docs]` · "revoked on removal" is correct · J4 D3.
- `06-data-flow.md` disputes `[security]` · `ModerationDispute` has a `disputant` · 04-class.puml.

## Per-dimension summary

- Design: n/a · Docs: consistent after fixes · Tests: n/a · Security/GDPR: inventory and
  cascade complete after DF4/DF5 · Correctness: aligned with UC1–UC33, 04-class, 02d, ADRs.
