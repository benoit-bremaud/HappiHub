# Event lock: re-read the editor after waiting (#374)

A save that waits on another transaction's event lock must report the editor that transaction committed, not `null`.

## Symptom

The BC5 integration test (`events.test.js`, concurrent saves of the same field) intermittently
answers the losing save with `details.lastEditedBy: null` instead of the winner's display name
(2 of ~6 runs on 2026-10-29). The 409 `EDIT_CONFLICT` itself is correct; only the editor name is lost.

## Cause (confirmed 2026-11-06)

`lockEvent` (`server/services/events.js`) runs one statement:

```sql
SELECT … FROM event e LEFT JOIN account editor ON editor.id = e.last_edited_by
WHERE e.id = $1 AND e.association_id = $2 FOR UPDATE OF e
```

Under READ COMMITTED, when the row of `e` is locked by another transaction, PostgreSQL waits,
then re-fetches the **newest committed version of `e` only** and re-checks the query against it
(EvalPlanQual). The `editor` row stays the one read with the statement's original snapshot —
the previous editor. The join condition `editor.id = e.last_edited_by` now compares the previous
editor's id with the new `last_edited_by`, fails, and the `LEFT JOIN` produces `NULL` columns.
The PostgreSQL documentation (§ 13.2.1, Read Committed) warns that join re-checks with locked
rows can give such inconsistent results.

Evidence: a deterministic test holds a transaction that sets `last_edited_by` to Malik, starts
Claire's save on version 1, waits until her session is blocked on the lock (`pg_stat_activity`),
then commits. Claire receives 409 with `lastEditedBy: null` on every run. The HTTP race of BC5
only hits this interleaving when one save blocks on the other, hence the flakiness.

All callers of `lockEvent` (edit, publish, cancel, delete) are exposed; edit is the visible one
because only the conflict details expose the editor name.

## Options and decision matrix

| Criterion (weight) | A lock, then read | B `FOR UPDATE OF e, editor` | C scalar subquery for the name | D REPEATABLE READ + retry |
|---|---|---|---|---|
| Correct by documented semantics (35) | 5 — the second statement takes a fresh snapshot after the lock | 0 — PostgreSQL refuses `FOR UPDATE` on the nullable side of an outer join; an inner join would hide events whose editor was deleted | 3 — subplans are re-run on re-check, but this rests on EPQ internals, not a documented guarantee | 4 — serialization failure then retry is correct |
| Simplicity (25) | 4 — two short statements, reuses `findEvent` | 3 — one-line change, but wrong | 4 — one-line change in the column list | 1 — retry loop, isolation level per transaction |
| No new lock or contention (20) | 5 — same single row lock | 1 — locks account rows, new lock-order risk after #378 | 5 | 4 — adds retries under contention |
| Query cost (10) | 3 — one extra primary-key read | 5 | 5 | 2 |
| Testability (10) | 5 | 4 | 5 | 3 |
| **Total /500** | **455** | 185 | 405 | 295 |

Totals recomputed by script. Sensitivity: with simplicity 40 and correctness 20, A 440 > C 420 >
D 250 > B 230; A stays first.

**Proposed: A.** `lockEvent` takes the row lock with `SELECT 1 FROM event WHERE id = $1 AND
association_id = $2 FOR UPDATE`, throws 404 when no row comes back, then returns `findEvent` on the
same client. In READ COMMITTED each statement sees all data committed before it starts, so the
read after the lock sees the committed event and its editor together.

## Acceptance criteria

- AC374-1: a save on version 1 that waited on a transaction committing version 2 by Malik answers
  409 `EDIT_CONFLICT` with `details.version: 2` and `details.lastEditedBy: 'Malik'`. The
  deterministic integration test fails without the fix and passes with it.
- AC374-2: BC5 and the other edit, publish, cancel and delete integration tests stay green.
- AC374-3: an unknown id or an id of another association still answers the same 404.
- AC374-4: no new lock: the only row lock taken by `lockEvent` stays the event row.
