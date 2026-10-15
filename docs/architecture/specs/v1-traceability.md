# HappiHub V1 — traceability matrix and final conception review (#247)

Status: review findings and resolutions validated by the owner on 2026-10-15 (T1, T2 with its
default values, T4 by MCDA top score; T3, T5–T11 as proposed). The validated package still
needs the implementation-approval gate; this document does not authorize code.

Sources (baseline main e641b4d, plus the corrections of this branch): [framing](v1-product-framing.md), [personas](v1-personas.md),
[journeys](v1-user-journeys.md), [use cases](v1-use-cases.md), diagrams in
[`../diagrams/v1-events/`](../diagrams/v1-events/) (01 use case, 02a–02d sequences,
03 component, 04 class, 05a/05b state, 06 data flow), ADR-0001, ADR-0002.

## Reading conventions

Two identifier families collide in the sources and are disambiguated here:

- **Success measures** are written `mS1`–`mS7` (framing); **decisions** `S1` (closing blocked
  while suspended) and `S2` (draft cleanup) keep their names.
- **Data flows** are written `F1`–`F27` (06); **use-case review findings** are written
  `rF1`–`rF16` (01 notes).

Column abbreviations: Cls = class elements (04), Stm = state transitions (05a event, 05b
association), Seq = sequences (02a–02d), Cmp = HTTP/job component (03), Flow = data flows (06).
Component modules: AUTH, EV (Events), MEM (Membership), MOD (Moderation), PUB (Public read),
PAPI (Partner API), MJ (Maintenance job), OW (Outbox worker). "—" means none is expected;
**gap** marks a missing link as first found; every gap is resolved in section 5.

## 1. Use cases → conception elements

| UC | Cls | Stm | Seq | Cmp | Flow |
| --- | --- | --- | --- | --- | --- |
| UC1 Sign up an association | Account, Association, Membership, createdBy (0..5) | 05b [*]→Active | — | AUTH (**gap T3**) | F1, F6, F8, F9, F14 |
| UC2 Verify email | Account.emailVerifiedAt, verificationReminderAt | — (**gap T4**) | 02b note (join after UC2); 02d DF2 | AUTH | F8, F14, F24 |
| UC3 Reset password | Account.passwordHash, authVersion | — | — | AUTH | F1, F8, F14 |
| UC4 Update account | Account.pendingEmail (K12), displayName | — | — | AUTH | F6, F14 |
| UC5 Export my data | Account, Membership, Event, Invitation, ActivityEntry | — | — | AUTH (**gap T3**) | F22 |
| UC6 Delete my account | 0..1 author links (K7) | 05b Active/Suspended→Closed | — | AUTH (**gap T3**) | F26 |
| UC7 Edit association profile | Association, Image (logo) | — | — | MEM (**gap T3**) | F9, F12, F13, F10 |
| UC8 Close association | Association.status/closedAt | 05b →Closed→[*]; 05a Published→Cancelled | 02d | MEM, MJ | F21, F21b, F21c |
| UC9 Dispute a moderation decision | ModerationDispute, CaseStatus | 05b Suspended→Active (UC32) | — | MOD | F11, F14 |
| UC10 Manage invitations | Invitation, InvitationStatus | — | 02b | MEM | F8b, F10, F14, F20a |
| UC11 Join from invitation | Membership, Invitation | — | 02b | MEM | F8b, F20a, F10 |
| UC12 Remove / leave | Membership | — | — | MEM | F10, F14 (**gap T6** on F7) |
| UC13 Dispute a removal | RemovalDispute.removedAt | — | — | MOD | F11, F14 |
| UC14 Activity log | ActivityEntry | — | 02d purge | MEM | F10, F19 |
| UC15 Create event | Event, Venue, Price, Image, PosterStyle, EventType | 05a [*]→Draft | — (plain insert, 02a context) | EV + AddressLookup, FileStore | F9, F12, F13, F17 |
| UC16 Edit event | Event.version, lastEditedBy, scheduleChangedAt | 05a Draft/Published self | 02a | EV | F9 |
| UC17 Resolve conflict | Event.version | — | 02a | EV | F9 |
| UC18 Publish | Event.status, publishedAt | 05a Draft→Published | — | EV | F9, F10 |
| UC19 Cancel | Event.cancellationReason | 05a Published→Cancelled | — | EV | F9, F10 |
| UC20 Delete draft | Event, Image | 05a Draft→[*] | 02d (S2) | EV, MJ | F21, F21b |
| UC21 Browse agenda | Event, Venue.normalizedCity, EventType | — | — | PUB | F2 |
| UC22 View event page | Event (public projection) | 05a overlay Hidden → 410 | — | PUB | F2 |
| UC23 Share | — (client only) | — | — | client | — |
| UC24 Add to calendar | Event (public id) | — | — | PUB | F2 |
| UC25 Association page | Association (public fields) | 05b Closed / Suspended | — | PUB | F2 |
| UC26 Report | Report, ReportReason, ModerationTarget | — | — | MOD | F2, F11, F4 |
| UC27 Manage API keys | ApiKey (≤5), revocationNoticeAt | — | 02d (I1) | MEM (**gap T3**), MJ | F11b, F10, F21c, F14 |
| UC28 Retrieve events | ApiKey, Event | 05a overlay | 02c | PAPI | F3, F4, F18 |
| UC29 Handle report | Report, ModerationDecision (HIDE_EVENT, DISMISS) | 05a Visible→Hidden | — | MOD | F11, F14 |
| UC30 Resolve removal dispute | RemovalDispute, Membership | — | — | MOD | F11, F10, F14 (**gap T1**) |
| UC31 Suspend | Suspension, ModerationDecision (SUSPEND) | 05b Active→Suspended (**gap T4** accounts) | 02d lift | MOD, MJ | F11, F7, F14 |
| UC32 Resolve moderation dispute | ModerationDispute | 05a Hidden→Visible; 05b Suspended→Active | — | MOD | F11, F14 (**gap T1**) |
| UC33 Moderator role | Account.platformRole | — | — | MOD | F6, F14 (**gap T1**) |

Every use case reaches at least one class element and one component; no use case is orphaned.
UC23 is deliberately client-only (Web Share API).

## 2. Decisions → use cases → realization

| Decision | Use cases | Realized in |
| --- | --- | --- |
| J1 D1 one-screen sign-up | UC1 | Cls Account/Association/Membership |
| J1 D2 email + password, verified to publish | UC1, UC2, UC18 | ADR-0001; 05a publish guard |
| J1 D3 abuse guard (quotas, limits, report) | UC1, UC15, UC26 | 03 per-IP limits; **gap T2** (values) |
| J1 D4 public association page | UC7, UC25 | Cls Association public fields; PUB |
| J2 A4 four-step wizard | UC15 | Cls Event fields, PosterStyle, Image |
| J3 D1 live edit, "Updated on" | UC16 | Event.scheduleChangedAt; 02a |
| J3 D2 cancel keeps page | UC19 | 05a →Cancelled; Event.cancellationReason |
| J3 D3 automatic archive | — (system event) | 05a →Archived; 02d; SQ8 |
| J4 D1 email-bound invitation | UC10, UC11 | Invitation; 02b; SQ2 |
| J4 D2 optimistic versioning, field merge | UC16, UC17 | Event.version; 02a; Q1 |
| J4 D3 remove/leave + dispute | UC12, UC13, UC30 | RemovalDispute; **gap T6** |
| J4 D4 traceability, 12-month log | UC14 | ActivityEntry; 02d purge; F19 |
| J5 D1–D3 public page, share, calendar, troupe list | UC22–UC25 | PUB; public projection |
| J6 D1–D3 keyed read API | UC27, UC28 | ApiKey; 02c; PAPI; SQ3, SQ6, SQ7 |
| E1 cancelled/archived read-only | UC16 | 05a; 02a 409 |
| E2 future start | UC15, UC18, UC16 | 05a guard; SQ1; 02a |
| A2 password policy | UC1, UC3, UC4 | AUTH (rule, no class change) |
| A5 immediate deletion | UC6 | K7; 06 F26 |
| M1 several associations | UC1, UC6, UC11, UC31 | Membership; Association createdBy 0..5 |
| P1 city + type filters | UC15, UC21 | Venue.normalizedCity; EventType (K5) |
| I1 dormant key revocation | UC27 | ApiKey.revocationNoticeAt (K9); 02d |
| AD2 suspension durations | UC31 | Suspension.endsAt; 02d lift |
| S1 no closing while suspended | UC8 | 05b guard |
| S2 draft cleanup | UC20 | Event.cleanupNoticeAt (K9); 02d |
| Q1 server field merge | UC16, UC17 | 02a |
| Q2 outbox | all emailing UCs | 03 Outbox port, OW; 02b, 02d; K6 |
| C1 venue by value | UC15 | Venue <<value>> |
| C2 two dispute classes | UC9, UC13, UC30, UC32 | RemovalDispute, ModerationDispute |
| C3 ModerationTarget | UC26, UC29, UC31 | ModerationTarget <<value>> |
| K4, K5, K7, K9, K11, K12 | see 04 review table | 04 |
| SQ1–SQ8 | UC16, UC11, UC28, UC27, UC8, UC21/UC28 | 02a–02d, 04 |
| CP1–CP5 | cross-cutting | 03 |
| DF1–DF5 | UC2, UC6, UC10/11, UC29–UC32 | 06; 02b, 02d |
| rF1/rF8, rF2, rF3/rF10, rF11, rF16, rF4–rF6 | UC6, UC8, UC9/UC32, UC5, UC21, UC10/UC4/UC26 | 01 notes |
| Measures mS2, mS4, mS7 | UC27/28, UC18, UC15–UC22 | ApiKey.lastUsedAt; Event.status/publishedAt; Image.altText |
| Measures mS1, mS3, mS5, mS6 | — | database query / usability sessions / interview (no model) |

## 3. Orphan check (elements with no requirement)

- Class 04: every class, enum and attribute traces to a use case or decision above.
  `Account.authVersion` traces to ADR-0001 (password change revokes sessions).
- Component 03: every component traces; module ↔ use case assignment is implicit (**T3**).
- Data flows 06: F1–F27 all trace to a use case, the maintenance job or ADR-0001/0002.
- No orphan decision: every decision is realized in at least one diagram.

## 4. Gaps and findings (#247 review)

Review passes: requirements coverage, consistency, Clean/SOLID and simplicity, security and
GDPR, testability. Priority: Must (blocks the implementation gate), Should, Nice.

| # | Pass | Priority | Finding | Proposed resolution |
| --- | --- | --- | --- | --- |
| T1 | Coverage | Must | UC30 (removal dispute outcome), UC32 (reversal), UC31 3a (automatic lift) and UC33 (role grant/revoke) must be "logged in the moderation log", but `DecisionKind` only has DISMISS, HIDE_EVENT, SUSPEND, and no class records role changes | Validated, see section 5 |
| T2 | Coverage | Must | Quotas and rate limits are named but unvalued: event creation quota (UC15 1a, J1 D3), sign-up, report, export, verification/reset resend, wrong-password limits | Validated, see section 5 |
| T3 | Consistency | Should | 03 names six HTTP modules but does not say which hosts account (UC4–UC6), association profile/closure (UC7, UC8) and API key management (UC27) | Add the UC ↔ module table of section 1 to 03 notes |
| T4 | Coverage | Should | Account lifecycle (unverified, verified, suspended, deleted) has no state view, and whether a suspended account can still sign in (to read or dispute) is undefined; 02a checks association suspension only | Validated, see section 5 |
| T5 | Coverage | Should | No procedure creates the first SUPER_ADMIN although 04 requires at least one | Document an operator bootstrap step (one-off command run by the owner at deployment), no UC |
| T6 | Consistency | Should | 06 says sessions are revoked on removal from an association, but M1 allows several associations and UC12 only removes access to that association (per-request membership check, 02a) | Reword 06: removal ends access to that association at once; sessions are kept |
| T7 | Consistency | Nice | Identifier collisions: S1/S2 (measures vs decisions), F1–F16 (review findings vs data flows) | Keep the prefixes of this document; no rename in validated diagrams |
| T8 | Security | Nice | "No internal identifiers" on public pages is ambiguous while UC22/UC24/UC28 need a public event identifier | Clarify: public event ids are allowed; account, member and owner ids never are |
| T9 | Consistency | Nice | Association suspension "hides events the same way" (05a) without stating it is derived at read time rather than setting `hiddenByModeration` | Add one sentence to 05a: derived, the flag is untouched |
| T10 | Coverage | Open dependency | Legacy migration (pending/approved/rejected, unique title index, events without association, frozen participation/comments) is deferred to #246 | Keep as a precondition of the first data-touching brick |
| T11 | Coverage | Open dependency | Email provider, hosting/backups, Géoplateforme quota unconfirmed | Precondition of the bricks that use them |

Clean/SOLID and simplicity: no finding. The dependency rule holds (03: domain owns
`Repositories`, `Outbox`, `AddressLookup`, `FileStore`, `Clock`; `EmailSender` stays in
infrastructure, CP5); ports exist only at real boundaries (CP4); one job and one worker
(CP1); no speculative entity (K6 keeps the outbox out of the domain).

Security and GDPR: covered by ADR-0001/0002, SQ2, SQ3, SQ6, CP2 and DF1–DF5; findings T6, T8.
Testability: `Clock` port, `runOnce()`, fake `EmailSender` and idempotent batches make every
time rule and retry testable without infrastructure.

## 5. Owner decisions (2026-10-15)

Criteria for T1, T2, T4: requirement covered 30, simplicity 25, consistency with validated
diagrams 20, security/GDPR 15, testability 10.

| # | Kept (score /500) | Rejected (score) | Applied in |
| --- | --- | --- | --- |
| T1 | Extend `DecisionKind` (430) | `PlatformAuditEntry` class (385); technical logs only (345) | 04 class |
| T2 | Value table now, configurable constants (455); defaults validated; local review M2: sign-in failures counted per (account, IP) plus per IP (465 vs progressive delay 365, per account 340) | Single generic per-IP limit (365); defer to the brick (360) | use cases § Quotas and rate limits |
| T4 | Text rule, no state diagram; 02a also checks account suspension (460). Amended by local review M1 (B, 410 vs emailed links 405, manual request 370): a suspended account signs in only to "My account" (UC5, UC6, UC9) to keep GDPR rights | Diagram 05c + rule (400); 05c + read-only sign-in (385) | UC31, 02a |
| T3 | Use case ↔ module table | — | 03 |
| T5 | Operator bootstrap of the first SUPER_ADMIN | — | 04 |
| T6 | Removal ends association access, sessions kept | — | 06 |
| T7 | Prefixes mS*/rF* in this document only | — | here |
| T8 | Public event identifier allowed | — | use cases, public browsing |
| T9 | Suspension effect derived at read time | — | 05a |
| PR #269 C1–C3 | Last SUPER_ADMIN cannot delete itself (480); `Suspension.issuedBy`/`liftedBy` (440); reset/verification limited per IP before lookup with a silent per-recipient cap (445) | see 04 and use cases | 04, UC6, § Quotas |
| T10, T11 | Not resolved: open dependencies, preconditions of the affected bricks | — | HANDOVER |

Runner-ups recorded as design fallbacks: T1 `PlatformAuditEntry` if the moderation log must
later be split by audience; T4 diagram 05c if the account lifecycle grows (V2); M1 emailed links (405) if restricted
sign-in proves hard to isolate.
