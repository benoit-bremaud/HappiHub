# Account and token lock order: one order everywhere (#378)

Status: approved by the owner on 2026-11-05 (MCDA option A, 480/500).
Source: local review of #341 (pre-existing defect). Extends: [maintenance unverified race](maintenance-unverified-race.md)
(#328 R2) and [resend verification purge race](resend-verification-purge-race.md) (#341 R1).
Diagram: [sequence](../diagrams/account-token-lock-order/01-sequence.md).

## Defect

Some account transactions lock the account's `auth_token` rows before the `account` row, others
the reverse. Two such transactions on the same account can each hold the lock the other waits
for: PostgreSQL aborts one with `40P01` (deadlock detected) and the API answers 500.

## Current lock sites (exhaustive, `server/` excluding tests)

| # | Site | Order today | Account lock taken |
|---|---|---|---|
| L1 | `verifyEmail` (`consumeToken` then `SELECT account FOR UPDATE`) | token → account | `FOR UPDATE` |
| L2 | `confirmPasswordReset` (`consumeToken` then `UPDATE account`) | token → account | `FOR NO KEY UPDATE` |
| L3 | `resendVerification` (#341 R1) | tokens → account | `FOR UPDATE` |
| L4 | maintenance `lockUnverified` (#328 R2), reminder and day-30 purge | tokens → account | `FOR UPDATE` |
| L5 | `requestPasswordReset` (`issueToken`: `DELETE` RESET rows, `INSERT` → FK check) | tokens → account | `FOR KEY SHARE` (FK) |
| L6 | `updateAccount` (`SELECT account FOR UPDATE`, later `issueToken` on email change) | **account → tokens** | `FOR UPDATE` |
| L7 | `deleteAccount` (UC6) → `deleteAccountRow` (account `FOR UPDATE`, `DELETE account` cascades to tokens) | **account → tokens** | `FOR UPDATE` |
| L8 | `signUp` → `issueToken` on the account it just inserted | n/a (row invisible to others) | — |
| L9 | maintenance `DELETE FROM auth_token WHERE expires_at <= now` (autocommit, many accounts) | tokens only | — |

Not involved (no `auth_token` lock): `associations.createAssociation` (account `FOR UPDATE`, then
advisory lock), `events` (account `FOR SHARE`), `reencrypt` (`SKIP LOCKED` batches), `seedDemo`
(single-process tooling), invitations, outbox.

Deadlock pairs: L6 or L7 against any of L1–L5 on the same account. L4 → L7 is already safe
because the purge locks tokens before calling `deleteAccountRow`.

## Rules

- R1. One order for every transaction that touches both: the account's `auth_token` rows first,
  then the `account` row. This keeps the order already approved for #328 and #341 (L1–L5 do not
  change) and fixes the two outliers.
- R2. A shared helper `lockAccountTokens(client, accountId)` runs
  `SELECT 1 FROM auth_token WHERE account_id = $1 ORDER BY id FOR UPDATE`. `ORDER BY id` gives
  two multi-row lockers of the same account the same row order. L3 and L4 use it instead of their
  inline query.
- R3. `updateAccount` (L6) calls `lockAccountTokens` before its `SELECT account FOR UPDATE`.
- R4. `deleteAccount` (L7) calls `lockAccountTokens` before `deleteAccountRow`. `deleteAccountRow`
  keeps its contract: its caller must already hold the tokens lock (the purge does, via L4); its
  doc comment states it.
- R5. No retry on `40P01`: a residual deadlock is a design defect to fix, not to hide.
- R6. L9 (bulk expired-token purge) stays as is: it locks token rows only, holds no account
  lock, so it cannot form a cycle with R1 transactions; at worst it waits.

No API, schema or migration change; responses are unchanged.

## Acceptance criteria

- AC378-1. Integration test: a transaction holding the account's token lock, then requesting the
  account lock (the L1 pattern), runs concurrently with `updateAccount` changing the email →
  both complete, no `40P01`, no 500.
- AC378-2. Same as AC378-1 with `deleteAccount` (UC6): both complete without `40P01`; the
  deletion wins or waits, never deadlocks.
- AC378-3. Unit tests: `updateAccount` and `deleteAccount` issue the token lock query before the
  account lock query; L3/L4 lock queries carry `ORDER BY id`.
- AC378-4. Existing UC2, UC3, UC4, UC6 and AC328/AC341 tests stay green.

## Decision (MCDA)

| Criterion (weight) | A: tokens → account everywhere (R1–R4) | B: account → tokens everywhere | C: retry the transaction on `40P01` |
|---|---|---|---|
| Removes the deadlock (35) | 5 — no cycle can form | 5 — no cycle can form | 3 — still deadlocks, 1 s `deadlock_timeout` then retry; bounded retries can still fail |
| Change size / risk (20) | 5 — 2 call sites + 1 helper | 2 — rewrites L1–L5, `consumeToken` becomes lookup-then-lock | 4 — one wrapper, but every transaction must be re-runnable |
| Fits approved conception (20) | 5 — extends #328 R2 / #341 R1 | 1 — reverses two approved specs | 2 — contradicts their "serialize, never deadlock" rule |
| Simplicity / readability (15) | 4 — one extra line per site, needs the R4 contract | 3 — natural parent-first order, but more queries | 4 — invisible at call sites |
| Testability (10) | 5 — deterministic lock-ordering test | 5 | 2 — needs a real deadlock and timing |
| **Total /500** | **480** | **335** | **310** |

Sensitivity (±10 on each weight, redistributed): A stays first in all 10 variants
(B ≤ 375, C ≤ 345).
