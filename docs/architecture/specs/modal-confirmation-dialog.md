# Modal confirmation dialog (#346)

Status: approved by the owner on 2026-11-05 (D1 A 460/500, D2 A 470/500, D3).
Source: issue #346, full local QA pass of 2026-10-26 (checklist A11Y-01, WCAG 2.1.2, 2.4.3, 4.1.2).
Amends: [client event workflow](v1-brick-b-client-event-workflow.md) (UC18–UC20 confirmations) and
[brick D](v1-brick-d-accounts-associations.md) (member removal, leave, close).
UML: [sequence](../diagrams/modal-confirmation-dialog/01-sequence.md),
[state](../diagrams/modal-confirmation-dialog/02-state.md).

## Defect

`client/src/events/ConfirmDialog.jsx` renders `<dialog open>`, a non-modal dialog: focus stays on
the trigger, Tab reaches the page behind, Esc does nothing, focus is not returned on close.
`AssociationPage.jsx` uses `window.confirm()` for member removal, leave and close, so the product
has two confirmation patterns (the native one cannot be styled, labelled or tested consistently).

## Decisions (MCDA, weights /100, scores 0–5)

### D1. Modal mechanism

| Criterion (weight) | A. native `<dialog>` + `showModal()` | B. custom focus-trap hook | C. library (`focus-trap-react`, Radix) |
|---|---|---|---|
| A11y correctness (30) | 5 — browser gives inert background, Esc `cancel`, top layer | 3 — must reimplement inert, Tab wrap, Esc; easy to miss cases | 5 — mature |
| Simplicity / KISS (25) | 5 — ~15 lines, no dependency | 2 — 60+ lines of trap logic | 3 — new dependency and API |
| Testability in jsdom 16 (15) | 3 — `showModal` absent, needs a 5-line stub in `setupTests.js` | 4 — pure DOM | 4 |
| Supply chain / maintenance (15) | 5 — none | 4 — own code to maintain | 2 — extra dependency, CVE surface |
| Browser support (15) | 4 — all evergreen since 2022 | 5 | 5 |
| **Total /500** | **460** | 320 | 365 |

Sensitivity: with testability weighted 30 (simplicity 10), A still leads (A 445, C 380). **A recommended.**

### D2. One pattern for associations

| Criterion (weight) | A. reuse `ConfirmDialog` (moved to a shared folder) | B. keep `window.confirm()` | C. new dedicated association dialog |
|---|---|---|---|
| Issue acceptance "one pattern" (35) | 5 | 0 — explicitly rejected | 3 — two components again |
| DRY / simplicity (30) | 5 — one component | 4 — zero code, but duplicated behavior | 2 |
| A11y / styling consistency (20) | 5 | 2 — native, unstyled, untestable text | 5 |
| Change size (15) | 3 — AssociationPage gains a `pending` state | 5 | 2 |
| **Total /500** | **470** | 230 | 315 |

Sensitivity: even with change size at 35 (acceptance 15), A leads (A 430, B 335). **A recommended.**
The component moves from `client/src/events/` to `client/src/ui/ConfirmDialog.jsx` because it is
no longer event-specific (named export kept; imports updated). Implementation follows the existing
folder convention: `client/src/components/ConfirmDialog/ConfirmDialog.jsx` with `confirm-dialog.css`.

### D3. Neutral close label

The `closeLabel` default `'Keep the event'` is event-specific. The neutral default becomes
`'Go back'` (not "Cancel", which collides with "Cancel the event"); event callers pass
`'Keep the event'` (cancel) and `'Keep the draft'` (delete) explicitly. One obvious option, no matrix.

## Rules

- R1. On mount the dialog calls `showModal()`; it is unmounted (and closed) when the caller removes it.
- R2. Initial focus goes to the **safe action** (close button) for destructive dialogs (`danger`),
  to the confirm button otherwise (publish). `autoFocus` on that button.
- R3. Esc fires the native `cancel` event; the component calls `preventDefault()` and `onClose()`
  so React state stays the single source of truth. Esc is ignored while `busy`.
- R4. Before `showModal()` the component records `document.activeElement`; on unmount it
  focuses that element again if it is still in the document. To keep the trigger mounted,
  StepPreview stops hiding its action buttons while a dialog is open (`!dialog &&` guards
  removed): the modal already makes the background inert.
- R5. `aria-labelledby` = title; `aria-describedby` = body wrapper. `role` stays the native
  `dialog` (`alertdialog` not used: a confirmation the user started is not an unsolicited alert).
- R6. Mobile first: actions stacked full-width under 48rem, side by side above; every button
  ≥ 44 × 44 px; dialog width `min(32rem, 100vw - 2rem)`; `::backdrop` uses a token color.
- R7. Click on the backdrop does nothing (avoids accidental dismissal of a destructive choice).
- R8. AssociationPage: `window.confirm()` is replaced by a `pending` state
  `{ title, body, confirmLabel, run }` rendered through `ConfirmDialog`; server error keeps the
  dialog closed and shows the existing message.

No API, server or schema change.

## Acceptance criteria

- AC346-1. Opening any confirmation calls `showModal()` and focus is inside the dialog (R2).
- AC346-2. Esc closes the dialog without running the action; `onConfirm` not called (R3).
- AC346-3. Esc while `busy` does not close the dialog (edge).
- AC346-4. After close (button or Esc), focus is on the trigger that opened it (R4).
- AC346-5. Dialog has accessible name = title and description = body (R5).
- AC346-6. Member removal, leave and close use `ConfirmDialog`; `window.confirm` no longer
  appears in `client/src` (grep check) (R8).
- AC346-7. Confirming in AssociationPage sends the same request as before; refusing sends none (sad path).
- AC346-8. CSS: buttons `min-height: 2.75rem`, stacked below 48rem (R6, checked in review/QA).
- AC346-9. Existing events tests (publish, delete, CC9 cancel) still pass unchanged in intent.

Test setup: jsdom 16.7 lacks `showModal`/`close`; `setupTests.js` stubs them on
`HTMLDialogElement.prototype` (set `open`, dispatch nothing). Esc is simulated by dispatching a
`cancel` event on the dialog, as the browser does.

## Traceability

UC18 publish, UC19 delete, UC20 cancel (event client); brick D member removal, leave, close.
QA finding A11Y-01 → #346.
