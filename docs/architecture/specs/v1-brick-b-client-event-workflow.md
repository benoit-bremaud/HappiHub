# HappiHub V1 — brick B client: event workflow (UC15–UC20, #252)

Status: **decided by the owner on 2026-10-22** (section 9). Implementation may start on its own branch, within this specification.

Baseline: `main` @ `45730f0`. Inputs: [use cases](v1-use-cases.md) UC15–UC20, E1, E2;
[brick B backend](v1-brick-b-event-lifecycle.md) (§ 5 API, M merge, § 12 amendments);
[API contract](../../API_DOCUMENTATION.md); diagrams [02a](../diagrams/v1-events/02a-sequence-autosave-conflict.md),
[05a](../diagrams/v1-events/05a-state-event.md); existing client `client/src/accounts/*`,
`api.js`, `session.js`. New diagrams: [v1-event-client](../diagrams/v1-event-client/).

## 1. Scope

| In scope | Use cases |
| --- | --- |
| Association events list (status filter, "ended" badge, last edited by) and "Create an event" | UC16 step 1 |
| Four-step editor: 1 What? · 2 When and where? · 3 Look (poster style) · 4 Preview and checklist | UC15, UC16 |
| Draft created on first save; autosave with "Saving… / Saved ✓ / Not saved — Retry" | UC15 4, 4a, 6a |
| Different-field merge (silent) and same-field conflict resolution yours/theirs | UC16 2a, UC17 |
| Publish from step 4 with checklist linking to the failing step; resend verification | UC18 3a–3c |
| Cancel (final, optional reason) and delete draft, both with explicit confirmation | UC19, UC20 |
| Read-only view of cancelled/archived events with the reason | UC16 1a, E1 |
| Minimal public event page `/events/:id` (cancelled banner, "Updated on …") | UC18 4, UC19 4 |
| Session expiry in place: input kept, sign in again, explicit save (no auto retry) | UC15 *b |

Out of scope: image upload (image brick, UC15 7–8 → style only, UC15 7a path), final visual
design (Clément's input pending — neutral styling with the existing `hh-*` classes, poster
styles as six placeholder CSS themes), share actions and first-publication celebration
(UC18 4, agenda brick UC21–UC25), address suggestions (T11c, decision V fallback 5b), public
agenda and association public page.

## 2. Screens and routes

| Route | Screen | Access |
| --- | --- | --- |
| `/associations/:slug/events` | `EventListPage`: filter chips (all, draft, published, cancelled, archived), rows with title, type, status, start, ended, updated by | member |
| `/associations/:slug/events/new` | `EventEditorPage` in create mode, step 1; no request until the first valid save | member |
| `/associations/:slug/events/:id?step=1..4` | `EventEditorPage` (edit or read-only per status) | member |
| `/events/:id` | `PublicEventPage` | anyone |

`AssociationPage` gains a link "Events". Step in the URL so reload and back keep the place.
Entry step when no `step` query: decision R (section 7).

Step contents (fields from the API allow-list):

1. **What?** title (1–120), type (8 chips), short description (≤ 280, counter).
2. **When and where?** start, optional end (local `datetime-local` converted to ISO with zone),
   venue label, address, city picker (decision K), price kind + amount in euros (→ cents).
   Warning at once if start is past (E2), save still allowed.
3. **Look** poster style (6 keys) and long description (≤ 10 000).
4. **Preview** public projection rendered with the same `EventPoster` component as
   `/events/:id`, mobile and desktop widths side by side; checklist G1 (client mirror) and
   actions Publish / Cancel this event / Delete draft by status.

The live poster preview (`EventPoster`) is visible on steps 1–3 (UC15 2, 4, 6).

## 3. Client state model

Editor save status (diagram [05-state-editor](../diagrams/v1-event-client/05-state-editor.md)):
`idle → dirty → saving → saved | conflict | failed | unauthenticated | readOnly`.

- `event` = last server copy (with `version`); `draft` = values in the form; `base` = server
  value of each field at the moment it was first changed since the last successful save.
- One request in flight at a time; changes made during a save are kept and sent by the next one.
- Create mode: the first save is `POST` (only when title and type are valid); the route is then
  replaced by `/events/:id` without remount losing input.
- Autosave trigger: decision AS. Lifecycle actions first flush pending changes.

## 4. API calls and error handling

All calls through `send()` (`accounts/request.js`), which already attaches CSRF and JSON.
Mapping (sequence [02-sequence-editor-save](../diagrams/v1-event-client/02-sequence-editor-save.md)):

| Answer | Client behavior |
| --- | --- |
| 200/201 save | adopt `version`, `lastEditedBy`; clear the saved keys from `base`; "Saved ✓" (published: "Visible immediately") |
| 400 `INVALID_FIELD` / `UNKNOWN_FIELD` (`details.field`) | inline message on that field, input kept, status `failed` without Retry |
| 401 | status `unauthenticated`: banner with inline sign-in (reuses `POST /session`, then `session.acceptSession`); after sign-in the user presses "Save now"; never auto-retried |
| 403 (CSRF/Origin) | `session.refresh()` once to renew the token, then "Not saved — Retry" |
| 404 `EVENT_NOT_FOUND` | "This event no longer exists or you are no longer a member" + link to the list |
| 409 `EDIT_CONFLICT` | `ConflictPanel`: per field yours / theirs / by whom; choice → PATCH with `details.version` as `baseVersion` and only the chosen values; a new 409 repeats with the remaining fields (UC17 3a) |
| 409 `EVENT_READ_ONLY` | reload, switch to read-only with the explanation (E1) |
| 409 `STALE_VERSION` (lifecycle) | reload the event, show "The event changed; check and confirm again" |
| 409 `INVALID_TRANSITION` / `EVENT_ENDED` / `ASSOCIATION_CLOSED` | reload, server message, action buttons recomputed |
| 415 | programming error: generic "Not saved — Retry" (logged in console only in development) |
| 422 `PUBLICATION_REFUSED` | checklist from `details.failures`: `MISSING_FIELD:x` → link to the step of x; `EMAIL_NOT_VERIFIED` → "Resend the verification email" (`POST /email-verification/resend`); `START_IN_PAST` → link to step 2 |
| 422 `PUBLISHED_FIELD_REQUIRED` | inline on the field: "required while the event is published" |
| 429 `EVENT_QUOTA` | on create: "Creation possible again at HH:MM" from `Retry-After`; other 429: "Too many requests, wait N s" |
| network (status 0) | "Not saved — Retry", input kept |

Cancel: dialog explaining finality and public visibility, optional reason (≤ 500, counter),
`confirm: true`. Delete: dialog then `POST …/delete` and back to the list. Dialogs are in-page
(`<dialog>`), not `window.confirm`, so the reason field fits and tests are deterministic.

## 5. Components (diagram [03-component](../diagrams/v1-event-client/03-component.md))

New folder `client/src/events/`, flat, named exports:

| Module | Responsibility |
| --- | --- |
| `eventFields.js` | pure: field rules mirroring the API (lengths, types, styles, price), G1 checklist, step of each field, ISO/local date and euro/cents conversions, entry step (R) |
| `useEventEditor.js` | hook: load, draft/base/version, autosave queue, response mapping of section 4 |
| `EventListPage.jsx`, `EventEditorPage.jsx`, `PublicEventPage.jsx` | screens |
| `EventPoster.jsx` | preview shared by steps 1–4 and the public page |
| `ConflictPanel.jsx`, `ConfirmDialog.jsx`, `CityPicker.jsx` | sub-components |
| `events.css` | neutral layout + six placeholder poster themes, design tokens as CSS variables |

Dependency rule: screens → hook → `send`; `eventFields.js` imports nothing. No new npm
dependency. Plain text rendering only (React escaping, `white-space: pre-line` for line breaks).

## 6. Security and privacy

No author id in any request; slug and event id come from the route and the server re-checks
membership. Public page shows only the public projection fields. No event content in
`localStorage`. Fragment tokens untouched. Console logging of bodies forbidden.

## 7. Decisions (MCDA, weights proposed — to validate)

### S — Client scope while the visual design is pending

- **A** — Functional four-step wizard, neutral styling, placeholder poster themes; restyled later with Clément.
- **B** — One-page form (no steps), no live poster.
- **C** — Wait for Clément's design before any client.

| # | Criterion | W | A | B | C |
| --- | --- | --- | --- | --- | --- |
| 1 | Fidelity to UC15–UC18 (steps, preview, checklist links) | 30 | **5** | **2**: checklist cannot link to steps | **5** later |
| 2 | Organizer value now (J2, P1 Claire) | 25 | **5** | **3** | **0** |
| 3 | Rework when the design arrives | 20 | **3**: CSS/theme layer redone, structure kept | **2**: structure redone | **5** |
| 4 | Brick size / reviewability | 15 | **3** | **5** | **5** |
| 5 | Independence from undecided inputs | 10 | **5** | **5** | **0** |
| | **Total / 500** | 100 | **430** 🏆 | 300 | 325 |

Sensitivity: rework at 35 (value 10): A 400, C 400, B 285 — tie broken by organizer value now (C delivers nothing): A stays first.

### K — City picker data (no commune search endpoint exists)

- **A** — Add `GET /api/communes?q=` (≥ 2 chars, accent-insensitive prefix, 20 results, `publicReads` limiter) on the server: backend amendment A-B5.
- **B** — Ship the 1 MB `communes.json` to the client as a lazy chunk.
- **C** — Let the user type the INSEE code.

| # | Criterion | W | A | B | C |
| --- | --- | --- | --- | --- | --- |
| 1 | Organizer convenience (UC15 5b) | 30 | **5** | **5** | **0** |
| 2 | Single source of truth (DRY with server validation) | 25 | **5** | **2**: copy to keep in sync | **5** |
| 3 | Page weight / mobile (~250 KB gzip for B) | 20 | **5** | **2** | **5** |
| 4 | Simplicity / brick scope | 15 | **3**: small server route + tests | **4** | **5** |
| 5 | Reuse by the agenda city filter (P1) and partners | 10 | **5** | **2** | **0** |
| | **Total / 500** | 100 | **470** 🏆 | 320 | 300 |

Sensitivity: simplicity at 35 (convenience 10): A 430, B 300 — A stays first.

### AS — Autosave trigger

- **A** — Debounce 1.5 s after the last keystroke, plus on blur and on step change.
- **B** — On blur and step change only.
- **C** — Explicit "Save" button only.

| # | Criterion | W | A | B | C |
| --- | --- | --- | --- | --- | --- |
| 1 | No silent loss (UC15 4a, *a) | 35 | **5** | **4**: typing then closing the tab loses a field | **2** |
| 2 | Conflict exposure kept small (J4 D2) | 25 | **5**: frequent small saves | **4** | **2** |
| 3 | Request volume vs limiter (600 / 15 min / IP) | 20 | **3**: ~1 save / 1.5 s while typing, bounded by single in-flight | **5** | **5** |
| 4 | Simplicity | 20 | **3** | **4** | **5** |
| | **Total / 500** | 100 | **420** 🏆 | 420 | 305 |

A and B tie at 420; the tie is broken by the heaviest criterion (no silent loss): **A**.
Sensitivity: loss at 45 (volume 10): A 440, B 410; volume at 35 (loss 20): A 375, B 405 —
B wins only if request volume outweighs data loss.
`beforeunload` warning while `dirty` is added to either option.

### R — Entry step when resuming a draft (UC15 *a "last step reached")

- **A** — Derived: first step with a missing G1 field, else step 4 (no storage).
- **B** — Last step stored in `localStorage` per event.
- **C** — New server column `last_step`.

| # | Criterion | W | A | B | C |
| --- | --- | --- | --- | --- | --- |
| 1 | Matches the user's intent (resume where work is needed) | 35 | **4** | **4**: per-device only | **5** |
| 2 | Simplicity / no backend change | 35 | **5** | **4** | **1** |
| 3 | Works across devices and co-members | 30 | **5** | **1** | **4** |
| | **Total / 500** | 100 | **465** 🏆 | 310 | 330 |

Sensitivity: intent at 60 (others 20/20): A 440, C 400, B 340 — A stays first. UC15 *a wording to
amend to "resumes at the first step still incomplete".

## 8. Acceptance criteria and tests

| # | Criterion | UC |
| --- | --- | --- |
| CC1 | A member opens "Create an event", enters title + type, the draft is created once (one POST) and the URL becomes the event's | UC15 4 |
| CC2 | Changes save with the loaded version; "Saved ✓" shown; second save uses the new version | UC16 |
| CC3 | Network failure shows "Not saved — Retry", input kept; Retry sends the same changes | UC15 4a |
| CC4 | 409 `EDIT_CONFLICT` shows yours/theirs/editor per field; choosing resubmits with `details.version`; a second conflict shows only remaining fields | UC17 |
| CC5 | 401 keeps input, shows in-place sign-in, no automatic retry; after sign-in "Save now" saves | UC15 *b |
| CC6 | Past start shows the E2 warning at step 2 and the draft still saves | UC15 5c |
| CC7 | Publish 422 lists failures with links to the right step; `EMAIL_NOT_VERIFIED` offers resend | UC18 3a–3c |
| CC8 | Successful publish shows the public link; the public page renders without account data | UC18 |
| CC9 | Cancel needs the dialog confirmation, sends reason + `confirm: true`; the event becomes read-only with banner | UC19, E1 |
| CC10 | Delete is offered for drafts only, needs confirmation, returns to the list | UC20 |
| CC11 | Cancelled/archived events render read-only with no write request possible | UC16 1a |
| CC12 | 429 `EVENT_QUOTA` shows the time creation becomes possible again | UC15 1a |
| CC13 | City picker queries `GET /api/communes`, stores the code, shows the name (K-A) | UC15 5b |
| CC14 | Public page: 404 → "Event not found"; cancelled → banner with reason; schedule change → "Updated on …" | UC18, UC19 |
| CC15 | Text with markup is shown as text (no HTML rendering) | security |

Tests (pyramid): **unit** `eventFields.js` (rules, G1, step mapping, conversions, entry step)
and `useEventEditor` with `fetch` mocked at the boundary (CC2–CC5, CC12 queue, single
in-flight); **component** React Testing Library per screen (CC1, CC6–CC11, CC13–CC15);
**server** unit + integration for `GET /api/communes` (if K-A). **E2E/QA**: browser pass on the
running stack, two sessions for the conflict, screenshots under `docs/architecture/qa/`.
Coverage ≥ 80 % on new modules.

## 9. Owner decisions

| # | Decision | Recommendation (top score) | Next |
| --- | --- | --- | --- |
| S | Client scope | A four-step wizard, neutral styling (430) | C wait (325) |
| K | City data | A `GET /api/communes` server route, amendment A-B5 (470) | B bundle (320) |
| AS | Autosave trigger | A debounce + blur + step change (420, tie won on criterion 1) | B blur + step change (420) |
| R | Resume step | A derived from completeness (465) | C server column (330) |

| Date | S | K | AS | R | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-10-22 | A wizard (430) | A `GET /api/communes` (470) | A debounce + blur + step (420) | A derived (465) | Weights validated and top scores chosen by Benoît |
