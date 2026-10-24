# Current password: reserve the attempt before comparing (#329)

Status: approved by the owner on 2026-10-24 (MCDA option A, 465/500).
Source: [global review 2026-10-24](../review-global-2026-10-24.md), `server/controllers/accountController.js:131-138`.
Amends: [brick D](v1-brick-d-accounts-associations.md) AC6, AC8, AC17 (UC4 2a, UC6 2b, quotas T2). UML:
[sequence](../diagrams/current-password-reservation/01-sequence.md).

## Defect

`requireCurrentPassword` checks the per-account limit (5 per 15 min), runs bcrypt
(~250 ms), then counts the failure. N parallel `PATCH` or `DELETE /api/account` requests on
one session all pass the check before any is counted, so a stolen session can try far
more than 5 passwords per window.

## Rules (amend AC6/AC8/AC17)

- R1. Before the comparison, the request **reserves** one attempt on the account key
  (`take`). A refused reservation answers 429 with `Retry-After`, without comparing.
- R2. A correct password **releases** the reservation (`release`): successes never consume
  the quota, as today.
- R3. A wrong or missing password (or a failed compare) keeps the reservation (it is the counted failure) and
  answers the existing 403.
- R4. `release` never takes the counter below 0 and is a no-op once the window has reset.
- R5. The limiter stays process-local (ADR-0001); no per-IP limiter is added on
  `PATCH`/`DELETE /account`: the attack needs a session, and the per-account key bounds
  every session of that account. Revisit with multi-instance deployment.

The now-unused `hit` method is removed. No API, schema or migration change.

## Acceptance criteria

- AC329-1. Integration test: 8 concurrent wrong-password `PATCH /api/account` requests on
  one session → exactly 5 answer 403 and 3 answer 429 (red on the old code: 8 × 403).
- AC329-2. Unit test: `release` frees a reserved attempt, never goes below 0, and is a
  no-op after window reset.
- AC329-3. A correct password after 4 failures still succeeds and leaves the counter at 4.
- AC329-4. Existing UC4/UC6 tests stay green.

## Decision (MCDA)

| Criterion (weight) | A: reserve (`take`) + `release` on success | B: A + new per-IP limiter on PATCH/DELETE /account | C: per-account mutex serializing the compare |
|---|---|---|---|
| Closes the bypass (35) | 4 — exact per-account bound; no extra IP layer | 5 — same + IP layer | 4 — serialized, but queued requests hold memory |
| Simplicity (20) | 5 — one method, 3 lines | 3 — new limiter + route wiring | 3 — lock map, cleanup |
| Fits existing code (20) | 5 — mirrors `exports.take` | 3 — new spec'd quota | 2 — new concurrency primitive |
| UX / no false lockout (15) | 5 — successes free | 4 — shared IP (NAT) can 429 | 4 — latency under bursts |
| Testability (10) | 5 — deterministic | 4 | 3 — timing |
| **Total /500** | **465** | 395 | 330 |

Sensitivity (script, ±10 on each weight, redistributed over the others): A stays first in
10/10 variants (A ≥ 455 vs best alternative ≤ 410).
