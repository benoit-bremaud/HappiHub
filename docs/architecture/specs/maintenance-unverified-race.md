# Maintenance: recheck verification under lock (#328)

Status: approved by the owner on 2026-10-24 (MCDA option A, 480/500).
Source: [global review 2026-10-24](../review-global-2026-10-24.md), P1 `server/jobs/maintenance.js:40-43`.
Amends: [brick D](v1-brick-d-accounts-associations.md) AC19 (F24, DF2). UML:
[sequence](../diagrams/maintenance-unverified-race/01-sequence.md).

## Defect

`runMaintenance` scans never-verified accounts outside any transaction, then acts per row
without rechecking. An account verified between scan and act is deleted (day 30), or its
fresh VERIFY token is replaced and a reminder is sent although it is verified (day 23).
`unverifiedAccountsDeleted` and `remindersQueued` count scanned rows, not effects.

## Rules (amend AC19)

- R1. The scan only proposes candidates. Each candidate is processed in its own
  transaction that rechecks, under a row lock, the conditions that can change since the
  scan (`email_verified_at IS NULL`, and `verification_reminder_at IS NULL` for the
  reminder; `created_at` is immutable). A candidate that no longer matches is skipped with
  no effect. The recheck is done in code on the locked row, keeping SQL text constant.
- R2. Lock order is the one `verifyEmail` already uses: the account's `auth_token` rows
  first (`FOR UPDATE`), then the `account` row (`FOR UPDATE`). Both paths take locks in the
  same order, so a concurrent verification and maintenance serialize and never deadlock.
- R3. Outcomes of the race:
  - verification commits first → the recheck sees `email_verified_at` set → skip;
  - maintenance commits first → the consumed token no longer exists → the verification
    answers the existing neutral 410 ("expired or already used"); no 500.
- R4. `remindersQueued` and `unverifiedAccountsDeleted` count effects actually committed.
- R5. `verifyEmail` treats a missing account row as the same neutral 410 (defensive; the
  token cascade makes it unreachable under R2).

No API, schema or migration change. Other maintenance tasks are unchanged; per-row
failure isolation stays in #330.

## Acceptance criteria

- AC328-1. Integration test: a verification that holds its transaction open while the
  purge runs → the account survives and `unverifiedAccountsDeleted` is 0.
- AC328-2. Same race against the day-23 reminder → no reminder email, the account stays
  verified, `remindersQueued` is 0.
- AC328-3. Purge commits first → the verification link answers 410, account gone.
- AC328-4. Existing AC19 tests stay green.

## Decision (MCDA)

| Criterion (weight) | A: per-row recheck, tokens→account lock order | B: per-row account `FOR UPDATE` only | C: `SERIALIZABLE` + retry |
|---|---|---|---|
| Correctness (35) | 5 — no lost verification | 4 — correct, but a deadlock aborts the run | 5 — correct |
| Deadlock-free (20) | 5 — same order as `verifyEmail` | 2 — account→token vs token→account | 4 — serialization failures instead |
| Simplicity (20) | 4 — one helper, one extra query | 5 — smallest diff | 2 — retry loop |
| Fits existing code (15) | 5 — mirrors `runEventMaintenance` | 5 | 2 — new isolation pattern |
| Testability (10) | 5 — deterministic test | 4 | 3 — retry timing |
| **Total /500** | **480** | 395 | 355 |

Sensitivity (±10 on each weight, redistributed): A stays first in all 10 variants
(470–490 vs B ≤ 420).
