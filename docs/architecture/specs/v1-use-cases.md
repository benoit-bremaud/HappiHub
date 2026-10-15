# HappiHub V1 — use case specifications

Status: in progress (conception workshop 3). Each domain is reviewed and validated with the
owner. Diagram: [uc — HappiHub V1](../diagrams/v1-events/01-use-case.md). Sources:
[framing](v1-product-framing.md), [personas](v1-personas.md), [journeys](v1-user-journeys.md).
Session, CSRF and sign-in rules come from ADR-0001 and are referred to as "authenticated".

Format (Cockburn): level, primary actor, preconditions, minimal guarantee, success guarantee,
main success scenario, extensions, source. "The system" is HappiHub.

| Domain | Use cases | Status |
| --- | --- | --- |
| Event management | UC15–UC20 | **Validated 2026-10-15** |
| Account and association | UC1–UC9 | To do |
| Membership | UC10–UC14 | To do |
| Public browsing | UC21–UC26 | To do |
| Website integration | UC27–UC28 | To do |
| Administration | UC29–UC33 | To do |

## Event management

Common preconditions for UC15–UC20: the actor is authenticated, is a member of the
association that owns the event, and the association is not suspended. Every successful
write records the acting member and increments the event version (optimistic concurrency,
J4 D2).

### UC15 — Create an event

- **Level**: user goal. **Primary actor**: association member (Claire).
- **Stakeholders**: Claire wants a nice poster fast; Inès wants complete information later;
  the platform wants no spam.
- **Preconditions**: common preconditions; the association's creation quota is not exhausted.
- **Minimal guarantee**: nothing is published; any input already saved remains as a draft.
- **Success guarantee**: a draft event owned by the association exists with the entered
  content, "created by" recorded and the creation logged.
- **Main success scenario**:
  1. Claire starts "Create an event".
  2. The system shows step 1 "What?" with an empty live poster preview and examples per type.
  3. Claire enters title, type and short description.
  4. The system validates the fields, creates the draft on first save and shows "Saved ✓";
     the poster shows the title.
  5. Claire moves to step 2 and enters start date and time, optional end, venue (with
     address suggestions) and price (free, amount or pay-what-you-want).
  6. The system validates and autosaves; the poster shows date and venue.
  7. Claire uploads a photo or picks a poster style in step 3.
  8. The system checks the image, strips metadata, stores it and autosaves; the poster takes
     its look.
  9. Claire reaches step 4; the system shows the public page preview (mobile and desktop) and
     the publication checklist. The use case ends; publishing is UC18.
- **Extensions**:
  - 3a, 5a. Invalid or too long value: the system explains inline; nothing is lost.
  - 4a, 6a, 8a. Save fails (network): the system shows "Not saved", keeps the input in the
    page and offers "Retry"; no silent loss.
  - 5c. Start date or time already past: the system warns at once that it must be in the
    future to publish (E2); the draft can still be saved.
  - 5b. Address not found by suggestions: Claire keeps free text.
  - 7a. Image rejected (type or size): the system explains the limits and suggests a style.
  - *a. Claire leaves at any step: the draft keeps what was saved; she resumes later at the
    last step reached.
  - *b. Session expires: input stays in the page; Claire signs in again in place, then saves
    explicitly (no automatic write retry).
  - 1a. Quota exhausted: the system explains when creation becomes possible again.
- **Source**: J2 (A4 wizard), J1 D3 (quotas), #62 (images).

### UC16 — Edit an event

- **Level**: user goal. **Primary actor**: association member (Claire or Malik).
- **Preconditions**: common preconditions; the event is a draft or published. Cancelled and
  archived events are read-only (E1).
- **Minimal guarantee**: no other member's change is overwritten silently; the public page
  never shows a half-saved state.
- **Success guarantee**: the change is saved with the new version and "last edited by";
  if the event is published the change is public immediately.
- **Main success scenario**:
  1. The member opens the event and changes one or more fields in the same wizard steps.
  2. The system validates and saves with the version it was loaded from.
  3. The system confirms; for a published event it shows "Visible immediately" and, when the
     date, time or venue changed, marks the public page "Updated on …" and the API
     `updatedAt`.
- **Extensions**:
  - 2a. The version changed meanwhile and different fields were modified: the system merges
    automatically and confirms.
  - 2b. The version changed and the same field was modified: UC17 extends here.
  - 2c. A published event would lose a field required for publication: the system refuses
    and explains.
  - 1a. The event is cancelled or archived: the system shows it read-only and explains why.
- **Source**: J3 D1, J4 D2, J4 D4.

### UC17 — Resolve an edit conflict (extends UC16 at 2b)

- **Level**: subfunction. **Primary actor**: association member.
- **Trigger**: a save is rejected because another member changed the same field since the
  version was loaded.
- **Minimal guarantee**: neither value is lost until the member decides.
- **Success guarantee**: the event holds the value chosen for each conflicting field, with a
  new version.
- **Main success scenario**:
  1. The system shows each conflicting field with "yours" and "theirs" and who changed it.
  2. The member chooses per field.
  3. The system saves with the current version and confirms.
- **Extensions**:
  - 3a. A new change arrived during the choice: the system repeats from step 1 with only the
    fields still in conflict.
- **Source**: J4 D2.

### UC18 — Publish an event

- **Level**: user goal. **Primary actor**: association member.
- **Preconditions**: common preconditions; the event is a draft; the member's email is
  verified (UC2).
- **Minimal guarantee**: an incomplete or unverified publication never goes public.
- **Success guarantee**: the event is published, visible on its public page, in the agenda,
  on the association page and through the API; publication is logged.
- **Main success scenario**:
  1. From step 4, the member reviews the preview and the checklist.
  2. The member confirms "Publish"; the system recalls that the event can be edited or
     cancelled at any time.
  3. The system checks required fields (title, type, short description, start, venue) and
     publishes.
  4. The system shows the public link with share actions and, on the association's first
     publication, a sober celebration (none under reduced motion).
- **Extensions**:
  - 3a. A required field is missing: the checklist links to the step to complete; the event
    stays a draft.
  - 3b. Email not verified: the system offers to resend the verification email (UC2); the
    event stays a draft.
  - 3c. The start date is already past: the system refuses and links to step 2 (E2).
- **Source**: J2 step 4, J3, J1 D2.

### UC19 — Cancel an event

- **Level**: user goal. **Primary actor**: association member.
- **Preconditions**: common preconditions; the event is published and not yet archived.
- **Minimal guarantee**: no cancellation without explicit confirmation.
- **Success guarantee**: the event is cancelled permanently; its public page stays online
  with a "Cancelled" banner and optional reason; the API exposes the cancelled status; the
  cancellation is logged.
- **Main success scenario**:
  1. The member chooses "Cancel this event".
  2. The system explains that cancellation is final and visible to the public, and asks for
     an optional reason.
  3. The member confirms.
  4. The system cancels the event and shows the public page with its banner.
- **Extensions**:
  - 3a. The member gives up: nothing changes.
- **Source**: J3 D2.

### UC20 — Delete a draft

- **Level**: user goal. **Primary actor**: association member.
- **Preconditions**: common preconditions; the event is a draft (never published).
- **Minimal guarantee**: no deletion without confirmation; published events are never deleted.
- **Success guarantee**: the draft and its uploaded image are permanently removed.
- **Main success scenario**:
  1. The member chooses "Delete draft".
  2. The system asks for confirmation.
  3. The member confirms; the system deletes the draft and its image.
- **Extensions**:
  - 3a. The member gives up: nothing changes.
- **Source**: J3 ("only drafts can be deleted").

### Decisions — Event management (validated 2026-10-15)

- **E1** Cancelled and archived events are read-only (4.4). Rejected: archived description and
  image editable (3.8, partial-edit rule; candidate for V2); everything editable (2.6).
- **E2** Publication requires a future start date, with a warning already at step 2 (4.3).
  Rejected: publish with confirmation and archive at once (3.3, second path into "past",
  hides year typos); publish silently (2.9).
