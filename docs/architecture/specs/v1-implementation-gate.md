# HappiHub V1 — implementation-approval gate

Status: **approved by the owner on 2026-10-16** for version `798b323`. The first brick is the
#246 study (conception only); code bricks still wait for its outcome and their preconditions.

## 1. Conception version submitted

| Item | Value |
| --- | --- |
| Repository | benoit-bremaud/HappiHub |
| Branch | `main` |
| Commit | `798b323` (merge of PR #269, 2026-10-16) |
| Package | [framing](v1-product-framing.md), [personas](v1-personas.md), [journeys J1–J6](v1-user-journeys.md), [33 use cases](v1-use-cases.md), diagrams 01–06 in [`v1-events`](../diagrams/v1-events/), [traceability and final review #247](v1-traceability.md) |
| Review state | T1–T9 resolved and owner-validated (2026-10-15); T10, T11 open dependencies |

Any later change to these files produces a new version that needs its own approval.

## 2. Remaining preconditions

| Id | Precondition | Blocks |
| --- | --- | --- |
| T10 | Legacy data migration (#246): pending/approved/rejected moderation, unique title index, events without association, frozen participation/comments; final database choice | Every brick that reads or writes persisted data |
| T11a | Email provider (EU, zero budget) | Sign-up verification, password reset, invitations (UC1–UC3, UC10–UC11) |
| T11b | Hosting and backups, backup retention | Any deployment; data-flow retention (06) |
| T11c | Géoplateforme address-suggestion quota | Event location editing (server proxy, CP2) |

## 3. Candidate first bricks

| Brick | Content | Kind | Depends on |
| --- | --- | --- | --- |
| A | Data and migration study #246: database decision, target schema, legacy migration plan | Conception only, no code | Nothing |
| B | Event lifecycle and editor backend (draft, autosave, publication; UC15–UC20, 02a, 05a) | Code | A (T10), T11c for locations |
| C | Read-only partner API with named keys (UC27–UC28, 02c) | Code | A, B (published events) |
| D | Accounts and associations foundation (sign-up, verification, membership, UC1–UC12) | Code | A, T11a |

Natural sequence: A → D → B → C (B needs accounts and associations to own events; C
needs published events).

## 4. MCDA — first brick

Weights /100, scores 0–5, totals /500.

| Criterion | Weight | A | B | C | D |
| --- | --- | --- | --- | --- | --- |
| Unblocks later bricks | 30 | 5 — T10 gates all data bricks | 3 — unblocks C only | 1 — leaf | 4 — owners for B |
| Risk reduction (data, GDPR, rework) | 25 | 5 — settles database and migration first | 2 — built on an undecided store | 2 — same | 2 — same, plus email T11a |
| Visible product value | 20 | 2 — no user-facing change | 5 — the core organizer need | 3 — partners only | 3 — prerequisite flows |
| Effort within zero budget | 15 | 4 — documentation | 2 — largest brick | 3 — small | 2 — email provider needed |
| Reversibility | 10 | 5 — documents only | 2 — schema lock-in | 3 — thin read layer | 2 — account schema lock-in |
| **Total** | 100 | **425** | 290 | 215 | 280 |

Sensitivity: raising product value to 40 (unblocking 20, risk 15) gives A 365, B 340: A
stays first. B wins only if T10 is waived, which contradicts the validated review.

Recommendation: **A, the #246 data/migration study**. Runner-up B (290) is the fallback
if T10 is ever waived; activation cost is low because B is already fully specified.

## 5. Owner decision

| Date | Approved version | First brick | Sequence | Notes |
| --- | --- | --- | --- | --- |
| 2026-10-16 | `main` @ `798b323` | A — #246 data/migration study (425/500) | A → D → B → C | Explicit approval by Benoît; no code authorized until #246 is validated |
