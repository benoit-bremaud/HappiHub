# HappiHub V1 — use case specifications

Status: complete — all 33 use cases validated with the owner on 2026-10-15 (conception
workshop 3). Diagram: [uc — HappiHub V1](../diagrams/v1-events/01-use-case.md). Sources:
[framing](v1-product-framing.md), [personas](v1-personas.md), [journeys](v1-user-journeys.md).
Session, CSRF and sign-in rules come from ADR-0001 and are referred to as "authenticated".

Format (Cockburn): level, primary actor, preconditions, minimal guarantee, success guarantee,
main success scenario, extensions, source. "The system" is HappiHub.

| Domain | Use cases | Status |
| --- | --- | --- |
| Event management | UC15–UC20 | **Validated 2026-10-15** |
| Account and association | UC1–UC9 | **Validated 2026-10-15** |
| Membership | UC10–UC14 | **Validated 2026-10-15** |
| Public browsing | UC21–UC26 | **Validated 2026-10-15** |
| Website integration | UC27–UC28 | **Validated 2026-10-15** |
| Administration | UC29–UC33 | **Validated 2026-10-15** |

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
  - 5b. Address not found by suggestions: Claire keeps free text and picks the city from a
    list, so every event has a normalized city (P1).
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
- **Source**: J3 ("only drafts can be deleted"); a draft untouched for 12 months is also
  deleted automatically after a 14-day notice (S2).

### Decisions — Event management (validated 2026-10-15)

- **E1** Cancelled and archived events are read-only (4.4). Rejected: archived description and
  image editable (3.8, partial-edit rule; candidate for V2); everything editable (2.6).
- **E2** Publication requires a future start date, with a warning already at step 2 (4.3).
  Rejected: publish with confirmation and archive at once (3.3, second path into "past",
  hides year typos); publish silently (2.9).

## Account and association

Account emails (verification, reset, notifications) go through the transactional email
provider still to be selected (zero budget, EU). Links in emails are single-use, expiring,
and never reveal whether an address has an account.

### UC1 — Sign up an association

- **Level**: user goal. **Primary actor**: visitor (Claire).
- **Preconditions**: none; sign-up rate limits not exceeded.
- **Minimal guarantee**: no account or association is half-created; the response never
  reveals whether the email already has an account.
- **Success guarantee**: an unverified account and an association with Claire as its only
  member exist; a verification email is sent; Claire is signed in and lands in UC15.
- **Main success scenario**:
  1. Claire chooses "Create my association".
  2. The system shows one screen: email, password (policy A2), association name.
  3. Claire submits.
  4. The system validates, creates the account and the association with a readable slug,
     sends the verification email and signs Claire in.
  5. The system opens "Create your first event" (UC15).
- **Extensions**:
  - 3a. Invalid field: explained inline, input kept (password excepted).
  - 4a. The email already has an account: the system shows the same neutral message and
    emails the address owner with sign-in and reset links.
  - 4b. An association with a similar name exists: the system warns "Your troupe may already
    be on HappiHub — ask a member for an invitation" and lets Claire continue; the slug gets
    a distinguishing suffix.
  - 3b. Rate limit reached: the system asks to retry later.
  - 1b. Claire is already signed in: only the association name is asked; refused beyond 5
    associations created by the account (M1).
- **Source**: J1 D1, D2, D3, M1.

### UC2 — Verify email address

- **Level**: user goal. **Primary actor**: registered user.
- **Preconditions**: the account exists and its email is not verified.
- **Minimal guarantee**: an expired, reused or foreign link verifies nothing.
- **Success guarantee**: the email is marked verified; publishing (UC18) and inviting (UC10)
  become possible; valid pending invitations to that email are offered to join (UC11 4c),
  also after an email change (UC4); joining stays an explicit user choice.
- **Main success scenario**:
  1. The user opens the link received by email.
  2. The system checks the token (single use, 24 h) and marks the email verified.
  3. The system confirms and returns to where the user was.
- **Extensions**:
  - 2a. Link expired or used: the system offers "Send a new link" (limited per hour).
  - 1a. The user never received the email: from the app, "Resend" (limited per hour).
  - 1b. Never verified: a reminder is emailed at day 23 and the account is deleted at day
    30 as in UC6, association content following UC8 (data-flow DF2).
- **Source**: J1 D2.

### UC3 — Reset a forgotten password

- **Level**: user goal. **Primary actor**: registered user.
- **Preconditions**: none (signed out).
- **Minimal guarantee**: the response never reveals whether an email has an account; a reset
  link works once.
- **Success guarantee**: the password is replaced, every existing session is revoked
  (ADR-0001 authentication version) and the user is signed in.
- **Main success scenario**:
  1. The user chooses "Forgot password" and enters an email.
  2. The system answers neutrally and, if an account exists, emails a link (single use, 1 h).
  3. The user opens the link and enters a new password (policy A2).
  4. The system replaces the password, revokes all sessions and signs the user in.
- **Extensions**:
  - 3a. Link expired or used: the system offers to start again.
  - 2a. Rate limit reached: neutral message, retry later.
- **Source**: J1 edge case "forgotten password".

### UC4 — Update my account

- **Level**: user goal. **Primary actor**: registered user.
- **Preconditions**: authenticated.
- **Minimal guarantee**: email and password never change without the current password.
- **Success guarantee**: the display name, email or password is updated.
- **Main success scenario**:
  1. The user opens "My account" and changes the display name, email or password.
  2. For an email or password change, the system asks for the current password.
  3. The system saves. A new email stays pending until verified through UC2; the old address
     is notified. A new password revokes the other sessions.
- **Extensions**:
  - 2a. Wrong current password: refused, rate-limited.
  - 3a. The new email already has an account: neutral message, no disclosure.
- **Source**: framing, #263.

### UC5 — Export my data

- **Level**: user goal. **Primary actor**: registered user.
- **Preconditions**: authenticated.
- **Minimal guarantee**: the export contains only the requester's own data.
- **Success guarantee**: a JSON file with the account, memberships, and the events, invitations
  and log entries the user authored is downloaded.
- **Main success scenario**:
  1. The user chooses "Export my data".
  2. The system builds the file and offers the download.
- **Extensions**:
  - 2a. Repeated requests: limited per day.
- **Source**: review F11 (GDPR right of access).

### UC6 — Delete my account

- **Level**: user goal. **Primary actor**: registered user.
- **Preconditions**: authenticated.
- **Minimal guarantee**: no deletion without the current password and explicit confirmation.
- **Success guarantee**: the account and its personal data are deleted immediately (A5);
  memberships end and log entries are attributed to "former member"; association content stays with the association,
  attributed to "former member"; pending invitations to its email, its own disputes and its
  unsent emails are deleted (see the [data-flow diagram](../diagrams/v1-events/06-data-flow.md)).
- **Main success scenario**:
  1. The user chooses "Delete my account".
  2. The system explains the consequences and asks for the current password and confirmation.
  3. The user confirms.
  4. The system deletes the account immediately (A5), revokes every session and signs the user out.
- **Extensions**:
  - 2a. The user is the last member of one or more associations: the system lists them and
    warns explicitly that each will be closed with the account and lists the effects (UC8); confirmation
    covers both (review F8).
  - 2b. Wrong password: refused, rate-limited.
- **Source**: framing (GDPR), review F1, F8.

### UC7 — Edit the association profile

- **Level**: user goal. **Primary actor**: association member.
- **Preconditions**: authenticated member; association not suspended.
- **Success guarantee**: the public association page shows the new name, logo, city,
  presentation, website link or generic contact email; the change is logged.
- **Main success scenario**:
  1. The member opens the association profile and edits fields.
  2. The system validates (logo: image rules #62; contact email: optional, generic) and saves.
- **Extensions**:
  - 2a. Name change: the slug stays stable to keep shared links working.
- **Source**: J1 D4.

### UC8 — Close the association

- **Level**: user goal. **Primary actor**: association member (last member).
- **Preconditions**: authenticated; the actor is the only member; the association is not
  suspended (S1).
- **Minimal guarantee**: no closure while other members remain; explicit confirmation.
- **Success guarantee**: upcoming events are cancelled ("Association closed"), API keys are
  revoked, the page shows "Association closed" for 30 days with its slug reserved, then all
  association content and its log are deleted; the member's account remains.
- **Main success scenario**:
  1. The member chooses "Close the association".
  2. The system lists the effects and asks for confirmation.
  3. The member confirms; the system applies the closure.
- **Extensions**:
  - 1a. Other members remain: the system explains they must leave or be removed first (UC12).
- **Source**: review F2.

### UC9 — Dispute a moderation decision

- **Level**: user goal. **Primary actor**: registered user (affected member or account).
- **Preconditions**: a moderation decision (hidden event, suspended account or association)
  affects the user; no open dispute exists for it.
- **Success guarantee**: a dispute with the user's explanation is queued for the super
  administrator (UC32); the user is told it was received.
- **Main success scenario**:
  1. The user follows "I dispute this" from the notification email or the decision notice.
  2. The user writes an explanation (bounded length).
  3. The system records the dispute, notifies the super administrator and confirms.
- **Extensions**:
  - 1a. A dispute is already open: the system shows its status.
  - 1b. The user is suspended: the dispute page stays reachable through the emailed link.
- **Source**: review F3/F10.

### Decisions — Account and association (validated 2026-10-15)

- **A2** Password policy aligned with NIST SP 800-63B-4 for single-factor passwords (4.3):
  15 to 64 characters, no composition rules, refusal of common and known-compromised
  passwords from a local list (no third-party call), hint "a sentence of 3 or 4 words".
  Must fit bcrypt's 72-byte limit. Existing shorter passwords still sign in (#262); the policy
  applies at the next change. Rejected: 12 characters (3.8, below the standard), 8 (2.9).
- **A5** Immediate deletion after current password and explicit confirmation (4.4). Rejected:
  14-day deactivation grace (3.8, extra state everywhere), deactivation without deletion (2.4,
  not GDPR erasure).

## Membership

All members of an association have the same rights (framing). Membership changes are logged
(UC14).

### UC10 — Manage invitations

- **Level**: user goal. **Primary actor**: association member (Claire).
- **Preconditions**: authenticated member with a verified email; association not suspended.
- **Minimal guarantee**: an invitation can only ever admit the invited email address.
- **Success guarantee**: a pending invitation exists for the email, sent by mail and shown as
  a copyable link; or a pending invitation is revoked.
- **Main success scenario**:
  1. Claire enters Malik's email and chooses "Invite".
  2. The system creates a single-use invitation bound to that email, valid 7 days, sends it
     and shows the link to copy (e.g. for WhatsApp).
  3. The system lists it under "Pending invitations" and logs it.
- **Extensions**:
  - 1a. The email is already a member: the system says so; nothing is sent.
  - 1b. A pending invitation exists for the email: the system offers to resend it.
  - 2a. Daily invitation quota reached (10 per association): the system explains.
  - 3a. Claire revokes a pending invitation: the link stops working at once; logged.
- **Source**: J4 D1.

### UC11 — Join an association from an invitation

- **Level**: user goal. **Primary actor**: visitor holding an invitation (Malik).
- **Preconditions**: a valid invitation link.
- **Minimal guarantee**: an expired, revoked, used or foreign invitation admits nobody.
- **Success guarantee**: Malik is a member with the same rights as the others; the invitation
  is consumed; members can see it in the log.
- **Main success scenario**:
  1. Malik opens the link.
  2. The system shows the association and asks him to sign in or create an account with the
     invited email pre-filled (no association name asked).
  3. Malik signs in or signs up.
  4. The system checks that the account email matches the invitation and is verified, adds
     the membership and opens the association dashboard. Only a verified email can become a
     member.
- **Extensions**:
  - 4a. The account email differs: refused with a masked hint ("This invitation is for
    m•••@gmail.com, ask Claire to invite your address").
  - 2a. Invitation expired, revoked or used: the system explains and suggests asking again.
  - 3a. New account: created with the invited email, unverified; continues at 4c.
  - 4c. Account email not verified: the same link may have been copied into a chat, so
    following it proves nothing about mailbox ownership. The system asks to verify the email
    (UC2) and adds no membership. After verification, the user sees the still valid pending
    invitations for that email and chooses "Join" for each (back to step 4). An expired
    invitation shows "ask for a new one".
  - 4b. Malik already belongs to another association: the membership is added; the
    association switcher lists both (M1).
- **Source**: J4 D1.

### UC12 — Remove a member or leave the association

- **Level**: user goal. **Primary actor**: association member.
- **Preconditions**: authenticated member; the association has at least two members.
- **Minimal guarantee**: the association never ends up without a member.
- **Success guarantee**: the person is no longer a member, their sessions lose access to the
  association at once, content stays with the association, the action is logged and a
  removed person is emailed with an "I dispute this" link (UC13).
- **Main success scenario**:
  1. The member chooses "Remove" on another member, or "Leave the association".
  2. The system asks for confirmation.
  3. The member confirms; the system applies the change.
- **Extensions**:
  - 1a. The actor is the last member: leaving is refused; the system points to UC8 (close)
    or UC6 (delete account).
  - 3a. The removed member was editing: their next save is refused with an explanation.
- **Source**: J4 D3.

### UC13 — Dispute a removal

- **Level**: user goal. **Primary actor**: registered user (removed former member).
- **Preconditions**: the user was removed from an association less than 30 days ago; no open
  dispute exists for that removal.
- **Success guarantee**: the dispute and its explanation are queued for a moderator (UC30);
  the user is told it was received.
- **Main success scenario**:
  1. The user follows "I dispute this" from the removal email.
  2. The user writes an explanation.
  3. The system records the dispute, notifies moderators and confirms.
- **Extensions**:
  - 1a. More than 30 days passed or a dispute is open: the system explains.
- **Source**: J4 D3.

### UC14 — Consult the activity log

- **Level**: user goal. **Primary actor**: association member.
- **Preconditions**: authenticated member.
- **Minimal guarantee**: only members of this association see its log; no IP address is ever
  stored or shown.
- **Success guarantee**: the member sees, newest first, who did what and when over the last
  12 months (create, publish, cancel event; invite, join, remove, leave member; API key
  created or revoked; profile changed).
- **Main success scenario**:
  1. The member opens "Activity".
  2. The system lists entries with pagination.
- **Extensions**:
  - 2a. Entries older than 12 months: already purged.
  - 2b. An author deleted their account: shown as "former member".
- **Source**: J4 D4, J6 D2.

### Decisions — Membership (validated 2026-10-15)

- **M1** One account may belong to several associations (4.5): joining by invitation is
  unlimited, creating is capped at 5 associations per account to keep per-association quotas
  meaningful. The association is part of every URL (`/assos/<slug>/…`) with a switcher in the
  header; no "current association" is kept in the session. Rejected: unlimited creation (4.1,
  quota bypass), one association per account (3.4, V2 rework and migration), one account per
  association (2.0).
  Effects on other fiches: UC1 extension 1b (a signed-in user creates another association);
  UC6 extension 2a applies to every association where the user is the last member; UC31
  suspends one association or, for an account, all its memberships.

## Public browsing

No account, no cookie beyond what is strictly necessary, no third-party script. Public pages
only ever show published, cancelled or archived events of non-suspended associations, with the
J5 public fields: never drafts, member names, emails or internal identifiers. Pages are
server-rendered or prerendered enough to carry Open Graph metadata.

### UC21 — Browse upcoming events

- **Level**: user goal. **Primary actor**: visitor (Inès).
- **Minimal guarantee**: only public, upcoming events appear; no ranking or profiling.
- **Success guarantee**: Inès sees upcoming events in chronological order, filtered as chosen.
- **Main success scenario**:
  1. Inès opens the agenda (home page).
  2. The system lists published and cancelled upcoming events, soonest first, as compact cards
     (poster, title, date, city, status badge), paginated.
  3. Inès filters by city (list of cities that have upcoming events) and by type (chips);
     filters live in the URL so the view can be shared (P1). She opens an event (UC22).
- **Extensions**:
  - 2a. No event matches: friendly empty state suggesting to clear filters.
  - 2b. A cancelled event is listed with a visible "Cancelled" badge.
- **Source**: review F16, J3 D3.

### UC22 — View an event page

- **Level**: user goal. **Primary actor**: visitor (Inès).
- **Minimal guarantee**: a draft or hidden event is never displayed.
- **Success guarantee**: Inès reads what, when, where and how much within seconds.
- **Main success scenario**:
  1. Inès opens an event link.
  2. The system shows the status banner if any (cancelled with reason, past event, updated
     on …), the reduced poster, the essentials card and the actions (UC23, UC24, directions),
     then the long description and "Upcoming events from this troupe".
- **Extensions**:
  - 2a. Unknown, draft or deleted event: "This event does not exist" (404).
  - 2b. Event hidden by moderation or association suspended: "This event is no longer
    available" (410), without detail.
- **Source**: J5 D1, D3.

### UC23 — Share an event

- **Level**: user goal. **Primary actor**: visitor.
- **Success guarantee**: the event link is handed to the chosen app or copied.
- **Main success scenario**:
  1. Inès chooses "Share".
  2. The system opens the device's native share sheet with title and link.
- **Extensions**:
  - 2a. Native sharing unavailable (desktop): the system copies the link and confirms.
- **Source**: J5 D2.

### UC24 — Add an event to a calendar

- **Level**: user goal. **Primary actor**: visitor.
- **Success guarantee**: Inès's calendar app receives the event (title, start, end, venue,
  link).
- **Main success scenario**:
  1. Inès chooses "Add to calendar".
  2. The system serves an .ics file with a stable event identifier.
- **Extensions**:
  - 2a. Event cancelled: the action is hidden.
  - 2b. No end time: a default duration of 2 hours is used and stated.
- **Source**: J5 D2.

### UC25 — View an association page

- **Level**: user goal. **Primary actor**: visitor.
- **Minimal guarantee**: no member name, personal email or street address is shown.
- **Success guarantee**: Inès sees name, logo, city, presentation, website link, optional
  generic contact email, upcoming events then the 6 latest past events with "See more".
- **Main success scenario**:
  1. Inès opens the association page from an event or a link.
  2. The system shows the page.
- **Extensions**:
  - 2a. Association closed: "Association closed" for 30 days, then 404.
  - 2b. Association suspended: 410 without detail.
- **Source**: J1 D4, J5 D3, F2.

### UC26 — Report an event or an association

- **Level**: user goal. **Primary actor**: visitor (no account needed).
- **Minimal guarantee**: reporting reveals nothing about the reporter to the association;
  abusive mass reporting is throttled.
- **Success guarantee**: a report with a reason is queued for moderators (UC29); the visitor
  is thanked.
- **Main success scenario**:
  1. Inès chooses "Report" on an event or association page.
  2. The system asks for a reason (spam, misleading, inappropriate, other) and an optional
     comment, plus an optional email to be informed of the outcome.
  3. Inès submits; the system records the report and confirms.
- **Extensions**:
  - 3a. Rate limit reached or bot detected (hidden honeypot field, no third-party captcha):
    the system refuses neutrally.
  - 3b. The same target already has an open report: the new one is attached to it.
- **Source**: J1 D3, review F6.

### Decisions — Public browsing (validated 2026-10-15)

- **P1** Agenda filters: city chosen from the list of cities with upcoming events, plus event
  type chips (fixed list of about 8 types aligned with J2 step 1), both in the URL; every event
  stores a normalized city (4.6). Rejected: free-text city + type (3.7, typos hide events),
  city only (4.3), city + type + period (3.7, crowded on mobile), keyword search (3.1).
  "Near me" geolocation is excluded from V1 (permission prompt, location data).
  Effect on UC15: at step 2 a normalized city is required; when the address is typed freely,
  Claire picks the city from a list.

## Website integration

Read-only, server-to-server, scoped to one association (J6). Key-authenticated routes send no
CORS headers, so browsers cannot call them from another origin.

### UC27 — Manage API keys

- **Level**: user goal. **Primary actor**: association member (Malik).
- **Preconditions**: authenticated member; association not suspended.
- **Minimal guarantee**: a secret is displayed only once and stored only as a hash; a revoked
  key stops working at once.
- **Success guarantee**: a named key exists (or is revoked), with ready-to-paste snippets;
  creation and revocation are logged.
- **Main success scenario**:
  1. Malik opens "Website integration" and chooses "Create a key", naming it "WordPress site".
  2. The system generates a secret with a recognizable prefix (e.g. `hh_live_`, so secret
     scanners can detect leaks), stores its hash and shows it once with copy buttons and
     snippets (WordPress/PHP, Node, curl) pre-filled.
  3. The system lists keys with name, creation date and `lastUsedAt`, never the secret.
- **Extensions**:
  - 1a. Key limit reached (5 per association): the system asks to revoke one first.
  - 3a. Malik revokes a key after confirmation: requests with it are refused from now on.
  - 3b. Rotation: Malik creates a new key, updates the site, then revokes the old one; both
    work in between.
  - 3c. A key unused for 180 days is revoked automatically; members are emailed 14 days
    before and the revocation is logged (I1). A never-used key counts from its creation.
- **Source**: J6 D1, D2.

### UC28 — Retrieve association events

- **Level**: user goal. **Primary actor**: partner website (system actor).
- **Preconditions**: a valid, non-revoked key; association not suspended or closed.
- **Minimal guarantee**: the response only ever contains the key's own association events
  in published, cancelled or archived state, with the J5 public fields.
- **Success guarantee**: the site receives the requested events and can show them; the key's
  `lastUsedAt` is updated.
- **Main success scenario**:
  1. The site server calls `GET /api/v1/events` with the key.
  2. The system authenticates the key and returns upcoming published and cancelled events
     (with `status`, `updatedAt`), soonest first, paginated.
  3. Optionally the site calls `GET /api/v1/events/{id}` for one event.
- **Extensions**:
  - 1a. `?include=past` adds archived events; `?updatedSince=` returns only changes.
  - 2a. Missing, invalid or revoked key: 401 without detail.
  - 2b. Rate limit exceeded (per key): 429 with `Retry-After`.
  - 2c. Association suspended or closed: 403 with a stable error code.
  - 3a. Event of another association, draft or unknown: 404 (no existence leak).
- **Source**: J6 D3, S2.

### Decisions — Website integration (validated 2026-10-15)

- **I1** Automatic revocation of keys unused for 180 days, with an email to members 14 days
  before, logged; reuses the scheduled job already needed for archiving and closures (4.3).
  Rejected: no expiry with a UI warning only (4.1, dormant keys stay valid), mandatory
  12-month expiry (2.9, breaks active sites when renewal is forgotten).

## Administration

Moderation applies after publication (no prior moderation). Every moderation action records
its author, reason and time in a platform moderation log (kept 12 months, no IP address) and
notifies the affected association members or account by email with an "I dispute this" link
(UC9). Conflict of interest: a moderator never handles a report or dispute in which they are the
disputing party, the author of the contested decision, a current or former member of the
association concerned, or otherwise directly involved; it is escalated to the super
administrator.

### UC29 — Handle a report

- **Level**: user goal. **Primary actor**: moderator.
- **Preconditions**: authenticated moderator; an open report exists.
- **Minimal guarantee**: the reporter's identity and email are never shown to the association.
- **Success guarantee**: the report is closed as dismissed, as "event hidden", or escalated
  to a suspension (UC31); the reporter is informed if they left an email, which is then
  deleted.
- **Main success scenario**:
  1. The moderator opens the report queue, oldest first, grouped by target.
  2. The moderator reviews the target and the reasons.
  3. The moderator dismisses, hides the event, or opens UC31, writing a reason.
  4. The system applies the decision, logs it and notifies.
- **Extensions**:
  - 3a. Hiding: the event shows 410 publicly and disappears from agenda and API; the
    association sees it as "hidden by moderation" with the reason.
  - 3b. Conflict of interest: the system offers escalation only.
  - 4a. A hidden event is later restored through UC32: it returns to its previous state.
- **Source**: J1 D3, review F6.

### UC30 — Resolve a removal dispute

- **Level**: user goal. **Primary actor**: moderator.
- **Preconditions**: an open removal dispute (UC13).
- **Success guarantee**: the dispute is closed as upheld (the person is reinstated as a member)
  or rejected; both parties are informed; the decision is logged in the association log and
  the moderation log.
- **Main success scenario**:
  1. The moderator opens the dispute with the explanation and the association's activity
     entries around the removal.
  2. The moderator decides with a reason.
  3. The system applies it and notifies the disputing person and the association members.
- **Extensions**:
  - 2a. Conflict of interest: escalated to the super administrator.
  - 3a. Reinstatement while the association is closed: the dispute is rejected automatically
    with an explanation.
- **Source**: J4 D3.

### UC31 — Suspend an account or an association

- **Level**: user goal. **Primary actor**: moderator.
- **Preconditions**: authenticated moderator; the target is not the super administrator.
- **Minimal guarantee**: no suspension without a written reason; the target is notified with
  a dispute link.
- **Success guarantee**: a suspended association's public pages answer 410, its events leave
  agenda and API, its members cannot write for it; a suspended account loses its sessions and
  every membership's write access, for the chosen duration (AD2).
- **Main success scenario**:
  1. The moderator chooses "Suspend" on an account or association, from a report or directly.
  2. The moderator writes the reason and picks a duration: 7 days, 30 days or no limit (AD2).
  3. The system applies the suspension, revokes sessions where relevant, logs and notifies.
- **Extensions**:
  - 1a. Target is the super administrator or a moderator: only the super administrator may
    act (on a moderator).
  - 1b. Conflict of interest: escalated.
  - 3a. The duration ends: the scheduled job lifts the suspension, logs it and notifies.
- **Source**: platform administration decision (a2), anti-persona spammer.

### UC32 — Resolve a moderation dispute

- **Level**: user goal. **Primary actor**: super administrator.
- **Preconditions**: an open dispute about a hidden event or a suspension (UC9), or an
  escalated case.
- **Success guarantee**: the decision is confirmed or reversed (event restored, suspension
  lifted); the disputing party is informed; logged.
- **Main success scenario**:
  1. The super administrator opens the dispute with the original decision, its reason and
     author, and the explanation.
  2. The super administrator confirms or reverses, with a reason.
  3. The system applies, logs and notifies.
- **Extensions**:
  - 2a. The original decision was taken by the super administrator: the known limit applies
    (no independent review); the screen states it.
- **Source**: review F3/F10.

### UC33 — Grant or revoke the moderator role

- **Level**: user goal. **Primary actor**: super administrator.
- **Preconditions**: authenticated super administrator; the target account has a verified
  email.
- **Minimal guarantee**: there is always at least one super administrator; a moderator can
  never grant the role.
- **Success guarantee**: the target gains or loses the moderator role, is notified by email,
  and the change is logged; on revocation their moderator sessions lose that access at once.
- **Main success scenario**:
  1. The super administrator searches an account by exact email.
  2. The super administrator grants or revokes the role, after confirmation.
  3. The system applies, logs and notifies.
- **Extensions**:
  - 2a. Attempt to revoke one's own super administrator role: refused.
- **Source**: platform administration decision (a2).

### Decisions — Administration (validated 2026-10-15)

- **AD2** The moderator picks 7 days, 30 days or no limit; lifting is automatic at the end
  through the existing scheduled job (4.3). Rejected: no duration, lifted manually only (3.9,
  every lift depends on the owner), always permanent (2.6, disproportionate).
- Conflict of interest rule: a moderator never handles a case concerning an association they
  belong to; it is escalated to the super administrator.
