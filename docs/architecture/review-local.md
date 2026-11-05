# Local review — HappiHub (branch diff main...HEAD, #346)

- Date: 2026-11-05
- Commit: 1af8692
- Scope: branch diff `main...HEAD` (`--push`)
- Checks run: adversarial (Opus, round 1) · design · docs · tests · security · correctness
- Verdict: ship (Must fixed in c451f64) · Must 3 (fixed) · Should 7 (fixed) · Nice 5 (3 fixed, 2 accepted)

## Adversarial review (#236)
- Round 1 on `1af8692`: Must 3 · Should 6 · Nice 4 · unverified 2 · Push gate: closed
- Owner decision: option A (fix all, amend and revalidate the spec), 445/500
- Round 2 on `c451f64`: 11 fixed · 1 not fixed (S4 test title, renamed in the follow-up commit) · 0 regressed · new Must 0 · **Push gate: open**
- Hosted reviewers (pre-merge run on `7f1ec8a`): Copilot not enabled on the repo (no review possible) · Codex posted on `7f1ec8a`, no findings (ignored by owner rule)

## Pre-merge gate (head SHA 1af8692)
| Step | Result |
|---|---|
| 0 CI mirror | `quality-tests.yml`: collector unittest ✅ · server jest ✅ · client jest + coverage ✅ · client build ✅ (Node 22.21.1 locally vs 22.23.3 in CI) |
| 1 Tests | ✅ client 108 · ✅ server unit 164 · integration deferred to the pre-merge run |
| 2 Coverage | client 93.62 % stmts / 83.77 % branches / 94.48 % funcs / 96.8 % lines · docs ⏸ deferred |
| 3 SonarQube | ⏸ deferred to the pre-merge run (`--push`) |
| 4 Secrets | ✅ gitleaks clean (main..HEAD) · no tracked .env · diff read: nothing sensitive |
| 5 E2E/smoke | ⏸ deferred to the pre-merge run (`--push`) |
- Gate: `--push`: **pre-push green** — 113 client + 164 server unit tests, build, gitleaks; integration, SonarQube, E2E and doc coverage deferred to the pre-merge run

## Pre-merge run (head SHA 7f1ec8a)
| Step | Result |
|---|---|
| 1 Tests | ✅ client 113 · ✅ server unit 164 · ✅ server integration 222 (1 todo) |
| 2 Coverage | client 93.54 % stmts / 83.89 % branches / 94.5 % funcs / 96.8 % lines · server integration 93.15 / 82.57 / 96.54 / 94.36 · docs ⚠️ no doc-coverage counter in the repo |
| 3 SonarQube | ✅ QUALITY GATE STATUS: PASSED (local Community Build, main analysis of the branch tree) |
| 4 Secrets | ✅ gitleaks clean (main..HEAD) · no tracked .env · diff read: nothing sensitive |
| 5 E2E/smoke | ⚠️ the repo has no E2E or smoke suite; client production build compiles · QA pass: on staging after merge (no staging exists, #386) |
- Gate: **not GREEN** — steps 2 (doc coverage) and 5 (E2E) cannot run, Copilot review unavailable: merge needs the owner's waiver. Report-only commit after `7f1ec8a`.

## 🔴 Must Have
- `docs/architecture/specs/modal-confirmation-dialog.md:43-51` `[adversarial]` · Spec amended after approval (folder `components/`, label "Keep the draft") without recorded revalidation; stale `ui/` sentence · remove the `ui/` sentence, get and record owner revalidation.
- `docs/architecture/specs/modal-confirmation-dialog.md` R2, R8 `[adversarial|docs]` · R2 says `autoFocus`, R8 gives a pending shape that differs from the code · align both rules with the code.
- `docs/architecture/specs/v1-brick-b-client-event-workflow.md:104-118`, `docs/architecture/diagrams/v1-event-client/03-component.md:12-16` `[adversarial]` · stale copies place `ConfirmDialog` in `client/src/events/` and call dialogs in-page · update both.

## 🟡 Should Have
- `ConfirmDialog.jsx:41` `[adversarial|correctness]` · close button active while busy; the request still runs after the dialog closes · `disabled={busy}`, test.
- `ConfirmDialog.jsx:19-24` `[adversarial|correctness]` · a second Esc can close the native dialog while React still renders it · handle the native `close` event (re-open while busy, else `onClose`).
- `ConfirmDialog.jsx:11-24` `[adversarial|design]` · React 18 supports `onCancel`/`onClose` on `<dialog>`; removes refs written during render and manual listeners.
- `ConfirmDialog.test.jsx:92-96` `[adversarial|tests]` · trigger-removal test is vacuous · remove a real trigger before unmount.
- `ConfirmDialog.jsx:22` `[adversarial|correctness]` · Safari/macOS Firefox do not focus a clicked button, so focus return fails for mouse users there · narrow AC346-4 to keyboard activation (focus return applies to the focused element).
- `StepPreview.jsx:87` `[adversarial]` · "+ Add a reason" link below 44 px inside the dialog; focus lost when it is replaced · 44 px min-height in dialogs, focus the textarea.
- `pages.test.jsx` `[tests]` · no Esc / busy test on the association page · add one.

## 🔵 Nice to Have
- `ConfirmDialog.jsx:36` `[adversarial]` · `aria-describedby` points to an empty body when there are no children · set it only with children.
- `ConfirmDialog.jsx:40-41` `[design]` · two `data-initial-focus` attributes · two refs.
- `AssociationPage.jsx:104` `[design]` · `confirmThen` now only queues · rename `askConfirmation`, drop `danger ?? true`.
- `accounts.css` `[design|adversarial]` · shared dialog relies on button classes from accounts.css · acceptable while every page imports it; follow-up if lazy routes appear.
- `PROJECT_LOG.md:17-18` `[adversarial]` · #388 entry outside #346 · requested by the brief, kept.

## ⚪ Disagree / Intentional
- `StepPreview.jsx:57-66` `[adversarial]` · triggers stay mounted behind the modal · R4, background is inert.
- `setupTests.js` `[adversarial]` · `showModal` stub · D1, jsdom 16.7 lacks it.

## Per-dimension summary
- Adversarial: 3 doc Musts (revalidation, stale rules), busy/close sync Shoulds · Design: onCancel simpler, refs over data attributes · Docs: spec drift R2/R8 · Tests: vacuous unmount test, association Esc/busy missing · Security: no finding · Correctness: close while busy, double Esc.
