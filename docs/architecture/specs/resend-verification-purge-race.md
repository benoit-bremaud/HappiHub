# Resend verification: recheck under lock against the unverified purge (#341)

Status: approved by the owner on 2026-10-29 (MCDA option A, 480/500).
Source: local review of #328 (PR #342). Amends: [brick D](v1-brick-d-accounts-associations.md)
UC2 1a/2a. Follows: [maintenance unverified race](maintenance-unverified-race.md) (#328 R2 lock order).

## Defect

`resendVerification` (`server/services/accounts.js`) finds the account with a plain `SELECT`,
then `issueToken` deletes and inserts its VERIFY token. If the day-30 purge holds the account's
locks (`lockUnverified` then `deleteAccountRow`), the token `DELETE`/`INSERT` waits, then the
`INSERT` fails the `auth_token.account_id` foreign key once the account is gone: the caller gets
a 500 instead of the neutral answer of UC2 1a.

## Rules

- R1. After the lookup, `resendVerification` locks like `lockUnverified` (#328 R2): the
  account's `auth_token` rows `FOR UPDATE` first, then the `account` row `FOR UPDATE`. Same order
  as the purge and `verifyEmail`, so the paths serialize and never deadlock.
- R2. The locking `SELECT` on `account` repeats the lookup condition for that id
  (`(email_bidx = $2 AND email_verified_at IS NULL) OR pending_email_bidx = $2`). No row → return
  with no effect: the same neutral answer as an unknown email.
- R3. Outcomes of the race:
  - purge commits first → recheck finds no row → neutral answer, no token, no email, no 500;
  - resend commits first → the purge's recheck still sees an unverified account and deletes it
    (the fresh token cascades away; the queued email is the accepted residue of a day-30 account).

No API, schema or migration change; the response stays the same in every case.

## Acceptance criteria

- AC341-1. Integration test: a purge transaction holding the account's locks commits the
  deletion while a resend waits → the resend resolves without error, no VERIFY email is queued.
- AC341-2. Unit test: the recheck returns no row → no token query, no email queued.
- AC341-3. Existing UC2 resend tests and AC328 tests stay green; integration branch coverage ≥ 80 %.

## Decision (MCDA)

| Criterion (weight) | A: tokens→account lock + recheck (R1–R2) | B: `FOR UPDATE` on the lookup only | C: catch FK error 23503 → neutral |
|---|---|---|---|
| Correctness (35) | 5 — no 500, no work on a gone account | 4 — fixes the 500 | 3 — the transaction is aborted; needs a savepoint |
| Deadlock-free (20) | 5 — same order as #328 R2 | 2 — account→token vs purge token→account | 5 — no new lock |
| Simplicity (20) | 4 — two queries, mirrors `lockUnverified` | 5 — one keyword | 3 — error-code branching |
| Fits existing code (15) | 5 — the #328 pattern | 3 — breaks the documented order | 2 — control flow by exception |
| Testability (10) | 5 — deterministic lock test | 4 | 4 |
| **Total /500** | **480** | **365** | **335** |

Sensitivity (±10 on each weight, redistributed): A stays first in all 10 variants
(B ≤ 395, C ≤ 375).
