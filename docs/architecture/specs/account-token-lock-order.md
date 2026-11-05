# Account and token lock order: one order everywhere (#378)

Status: approved by the owner on 2026-11-05 (MCDA option A, 480/500); revalidated the same day
after the pre-push review (D1 option A 420/500, D2 option A 470/500, see the end).
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

Deadlock pairs (account against tokens): L6 against L1 or L3 (`updateAccount` only touches VERIFY
rows); L7 against L1, L2, L3 or L5 (the cascade deletes every token). L4 cannot meet L6 or L7:
those need a session, which only verified accounts get, and L4 only targets unverified ones.

Token against token (found by the pre-push review): `auth_token.id` is a random UUID, so
`ORDER BY id` differs from the physical order in which L5's `DELETE … AND purpose` and L9's bulk
`DELETE` lock several rows of one account. An account with two RESET or two expired rows can then
deadlock between R2 and L5 or L9 with no account lock involved (reproduced in raw SQL).

## Rules

- R1. One order for every transaction that touches both: the account's `auth_token` rows first,
  then the `account` row. This keeps the order already approved for #328 and #341 (L1–L5 do not
  change) and fixes the two outliers.
- R2. A shared helper `lockAccountTokens(client, accountId)` runs
  `SELECT 1 FROM auth_token WHERE account_id = $1 ORDER BY id FOR UPDATE`. `ORDER BY id` gives
  two multi-row lockers of the same account the same row order. L3 and L4 use it instead of their
  inline query, and `requestPasswordReset` (L5) calls it before `issueToken`.
- R3. `updateAccount` (L6) calls `lockAccountTokens` before its `SELECT account FOR UPDATE`.
- R4. `deleteAccountRow` (L7, shared by UC6 and the day-30 purge) calls `lockAccountTokens` itself
  before its account lock, so no caller can forget it (a second lock inside the purge's own
  transaction is a no-op).
- R5. No retry on `40P01`: a residual deadlock is a design defect to fix, not to hide.
- R6. L9 (bulk expired-token purge) never waits on a token row:
  `DELETE FROM auth_token WHERE id IN (SELECT id FROM auth_token WHERE expires_at <= $1 FOR UPDATE SKIP LOCKED)`.
  A row skipped because a request holds it is purged at the next hourly run.
- R7. Accepted residual window: `FOR UPDATE` locks only the rows visible when it runs. A token
  committed between `lockAccountTokens` and the account lock (one round-trip) is not covered; a
  consumer of that token racing an account deletion can still get `40P01`. It needs a fresh
  link to be clicked within milliseconds of the deletion; closing it would need a per-account
  advisory lock everywhere (option C of the D1 revalidation), judged disproportionate.

No API, schema or migration change; responses are unchanged.

## Acceptance criteria

- AC378-1. Integration test: a transaction holding the account's VERIFY token lock, then requesting the
  account lock (the L1 pattern), runs concurrently with `updateAccount` changing the email →
  both complete, no `40P01`, no 500.
- AC378-2. Same as AC378-1 with `deleteAccount` (UC6): both complete without `40P01`; the
  deletion wins or waits, never deadlocks.
- AC378-3. Unit tests: `updateAccount` and `deleteAccount` issue the token lock query before the
  account lock query; L3/L4/L5 lock queries carry `ORDER BY id`; L9 uses `SKIP LOCKED`.
- AC378-5. Integration test: a session holds the lower-id token of an account with two tokens;
  `lockAccountTokens` and the L9 purge (then L5) contend for both rows → no `40P01`.
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

## Revalidation after the pre-push review (2026-11-05)

D1, fixing the token-against-token deadlock: A `ORDER BY id` kept, L9 `SKIP LOCKED`, L5 locks first,
R7 window documented (420/500); B drop `ORDER BY id` and rely on physical order (335); C
per-account advisory lock in every transaction (335). D2, where the deletion takes the tokens lock:
A inside `deleteAccountRow` (470/500); B in each caller, contract in a comment (350). The owner chose
A for both. Sensitivity: A first in every ±10 variant of both matrices.
