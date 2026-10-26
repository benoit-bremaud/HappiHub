# Public agenda — browse upcoming events without an account (#366)

Status: **proposed, awaiting Benoît's validation**. No code before validation (AGENTS.md).

UML: [diagrams/public-agenda/](../diagrams/public-agenda/).
Realises [UC21 — Browse upcoming events](v1-use-cases.md#uc21--browse-upcoming-events)
and decision P1 (validated 2026-10-15). Narrow slice of #126 (taxonomy and discovery needs
stay open there). Related: [brick B lifecycle](v1-brick-b-event-lifecycle.md) § 5 public read,
[API contract](../../API_DOCUMENTATION.md).

## 1. Goal and scope

The owner looked at the demo site on 2026-10-26 and asked that public events be visible
without signing in. Today a visitor can open one event only through its direct link
(`/events/:id`); there is no public list and the home page shows a welcome text.

In scope: a public list endpoint, a public city facet endpoint, the home page agenda with
URL-held filters, the cards linking to the existing public event page (UC22).

Out of scope: past-events archive browsing, association public page (UC25), share/calendar
(UC23/UC24), search, recommendation, categories beyond the fixed `EventType` list (#126),
Open Graph prerendering, 410 for hidden events (unchanged: 404).

## 2. Use cases

| ID | Use case | Actor | Notes |
| --- | --- | --- | --- |
| UC21 | Browse upcoming events | Visitor (Inès), any signed-in account too | main goal of this brick |
| UC21a | Narrow the agenda by type or city | Visitor | «extend» UC21 at step 3 (P1) |
| UC22 | View an event page | Visitor | existing; reached from a card |

Acceptance criteria (tests are written against these):

- **AC1** Without a session, `GET /api/events` answers 200 with the first page of events.
- **AC2** Listed: status `PUBLISHED` or `CANCELLED`, not hidden by moderation, association
  `ACTIVE`, not ended (A1 effective end ≥ now: `ends_at ≥ now`, or no end and
  `starts_at ≥ now − 24 h`). So ongoing events are listed. Never: `DRAFT`, `ARCHIVED`,
  ended, hidden, closed/suspended association.
- **AC3** Order: `starts_at` ascending, then `id` ascending (stable across pages).
- **AC4** Pagination: page size 20; `page` 1–50, default 1; response
  `{ items, page, pageSize, hasMore }`. Invalid `page`/`type`/`city` → 400 `VALIDATION_ERROR`.
- **AC5** Filters `type` (one of the 8 `EventType` values) and `city` (INSEE code) combine with AND.
- **AC6** Item projection = card fields only (§ 4); no account, member, owner or participant
  identifier, no version, editing metadata, `created_at`/`updated_at`, long description.
- **AC7** `GET /api/events/cities` lists `{ code, name }` of cities having at least one
  listed event (AC2), sorted by name.
- **AC8** Home page `/` shows the agenda for every visitor; cards show poster style, title,
  date, city, type, price and a "Cancelled" badge; a card opens `/events/:id`.
- **AC9** Filters are hidden behind one "Filter" button; opening it reveals type chips and a
  city select; the choice lives in the URL (`?type=&city=&page=`) and survives reload/share.
- **AC10** Empty result: friendly message with a "Clear filters" action when filters are set.
- **AC11** Both endpoints use the existing `publicReads` IP limiter (600 / 15 min).

## 3. Sequence

See [02-sequence-browse-agenda](../diagrams/public-agenda/02-sequence-browse-agenda.md).

## 4. API contract

`GET /api/events?page=1&type=THEATRE&city=75056` — public, no session, no CSRF.

```json
{ "items": [{
    "id": "uuid", "status": "PUBLISHED", "title": "…", "type": "THEATRE",
    "shortDescription": "…", "startsAt": "ISO", "endsAt": "ISO|null",
    "venueLabel": "…", "venueCity": { "code": "75056", "name": "Paris" },
    "priceKind": "FREE", "priceAmountCents": null, "posterStyle": "classic",
    "association": { "name": "…", "slug": "…" } }],
  "page": 1, "pageSize": 20, "hasMore": false }
```

`hasMore` is computed by fetching 21 rows (no `COUNT(*)`). `venueAddress` and
`cancellationReason` stay on the detail page only. The event id is the existing opaque
UUID (T8); the association slug is already public on the detail endpoint.

`GET /api/events/cities` → `[{ "code": "75056", "name": "Paris" }]`.
Routing: `/events/cities` is registered before `/events/:id`.

Existing indexes `event_status_starts_at_idx` / `event_status_ends_at_idx` serve the query; no
migration.

## 5. Privacy and security

- Same visibility predicate as `readPublicEvent`, minus `ARCHIVED`, plus "not ended", kept in
  one SQL fragment shared by the three public reads (DRY, no drift between list and detail).
- Projection is an explicit allow-list (`cardView`), not a spread of the member view.
- No personal data in the URL: only `type`, `city`, `page`.
- Enumeration: bounded by the page cap (50 × 20) and the IP limiter; ids are already public
  through the detail page.
- No ranking, no tracking, no cookie set by these reads.

## 6. Client

- `components/Home/Home.jsx` keeps the welcome line and renders `<Agenda />`.
- `events/Agenda.jsx`: reads `type`, `city`, `page` from `useSearchParams`, fetches
  `/api/events`, renders cards (`EventPoster` reuse) and "Previous / Next" links.
- `events/AgendaFilters.jsx`: a single "Filter" toggle (progressive disclosure); when open,
  type chips and a city `<select>` fed by `/api/events/cities` (fetched only when opened).
- Loading, error (retry) and empty states. No new dependency.

## 7. Decisions (MCDA, weights proposed — owner validates)

Criteria and weights: privacy/security 30, simplicity (KISS) 25, fit to UC21/P1 25,
UX/progressive disclosure 20. Scores 0–5, total /500.

### D1 — Which events appear

| Option | Priv. 30 | Simple 25 | Fit 25 | UX 20 | Total |
| --- | --- | --- | --- | --- | --- |
| **A upcoming + ongoing, published and cancelled** | 5 | 5 | 5 | 4 | **485** |
| B A + archived/past with a "Past" toggle | 4 | 3 | 3 | 4 | 360 |
| C published only (hide cancelled) | 5 | 5 | 2 | 2 | 365 |

A matches UC21 (2b: cancelled shown with badge). B adds a second mode nobody asked for yet.

### D2 — Pagination

| Option | Priv. 30 | Simple 25 | Fit 25 | UX 20 | Total |
| --- | --- | --- | --- | --- | --- |
| **A page number, size 20, `hasMore` via n+1** | 5 | 5 | 5 | 4 | **485** |
| B keyset cursor `(startsAt,id)` | 5 | 3 | 5 | 4 | 435 |
| C page + total count | 4 | 4 | 5 | 5 | 445 |

Shareable `?page=` URL (P1); data volume is small; keyset is a later upgrade if needed.

### D3 — Filters

| Option | Priv. 30 | Simple 25 | Fit 25 | UX 20 | Total |
| --- | --- | --- | --- | --- | --- |
| **A type + city behind one "Filter" button (P1 + progressive disclosure)** | 5 | 4 | 5 | 5 | **470** |
| B no filters in this brick | 5 | 5 | 2 | 3 | 385 |
| C type + city always visible | 5 | 4 | 5 | 3 | 430 |

Sensitivity: with simplicity at 40 (privacy 25, fit 20, UX 15) D3 gives A 460, C 430,
B 410; A stays first. D1 and D2 winners do not change under ±10 on any weight.

## 8. Test plan

- Server integration (`tests/integration/agenda.test.js`): AC1–AC7, AC11 route wiring, one
  fixture per excluded state (draft, archived, ended, hidden, closed association), ordering
  tie on equal `starts_at`, page boundary 20/21, 400 cases, projection key allow-list.
- Client (`events/agenda.test.jsx`): AC8–AC10 with a mocked `fetch` (boundary).
- QA: demo stack, home page signed out, filters, pagination, screenshots under
  `docs/architecture/qa/`.
