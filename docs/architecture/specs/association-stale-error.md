# Association page stale error — fix conception

Status: validated by the owner on 2026-11-06 (D1 = A); implemented. Date: 2026-11-06. Work item: issue #390.
This note specifies how the association page stops showing a refused action's error after a
later confirmed action succeeds, without changing the API contract.

## Cause

`AssociationPage.jsx` (`confirmPending`) sets the page `message` to an error when a confirmed
action (remove a member, close the association) is refused. The success branch only calls
`pending.after()` (reload or navigate) and never touches `message`, so the old alert stays above
the refreshed page. Leave navigates away, so it is not affected. The `Invitations` and
`ProfileForm` blocks already replace their own message on every outcome.

## Decision D1 — what the page shows after a confirmed action succeeds

| Criterion (weight) | A: clear `message` on success | B: show a success message per action | C: clear `message` when the dialog opens |
|---|---|---|---|
| Fixes the defect, never a stale alert (35) | 5 | 5 | 4 — also hides the error if the member cancels the dialog |
| Simplicity, KISS/YAGNI, minimal diff (25) | 5 — one call | 3 — a label per action, new copy | 5 — one call |
| UX consistency with the rest of the page (20) | 4 — the reloaded list is the feedback | 5 — matches Invitations ("Invitation revoked.") | 3 — the error vanishes before anything happens |
| Testability (20) | 5 | 4 | 4 |
| **Total /500** | **480** | 430 | 405 |

Sensitivity: B overtakes A only if UX consistency weighs 50 or more; with ±10 on any weight A
stays first. Decision: A.

## Design (option A)

In `confirmPending`, the success branch calls `setMessage(null)` before `pending.after()`.
No new state, no new component, no server change.

## Acceptance criteria

- AC1 a refused confirmed action shows its error (unchanged).
- AC2 a later confirmed action that succeeds removes that error.
- AC3 a test in `client/src/accounts/pages.test.jsx` covers refusal then success.
- AC4 existing client tests stay green; `npm run build` passes.

No UML diagram: one state assignment, no new actor, component or state worth modelling.
