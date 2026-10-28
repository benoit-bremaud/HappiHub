# QA pass — public agenda (#366)

Pass-level QA of the public agenda, run on 2026-10-28 on branch `feat/366-public-agenda` while signed out.

## Setup

Disposable stack: PostgreSQL `postgres:16-alpine` (container `happihub-qa-366`, 127.0.0.1:55433,
database `happihub_demo`), migrations, then `npm run seed:demo -- --confirm` (38 rows). API on port
5056, client on 3001. Synthetic local-only secrets were kept in the session scratchpad and never committed.

## Results

| Check | Result |
|---|---|
| `GET /api/events` signed out | ✅ 200, 15 cards, soonest first, no account ids or address in the payload |
| `GET /api/events/cities` | ✅ 7 cities sorted by name |
| Home page shows the agenda (AC8) | ✅ after fix: `.home` was a fixed `100vh`, vertically centred block, so the agenda's top (title and Filter button) was pushed above the scroll area and unreachable. Fixed in `home.css` (top-aligned, `min-height`) |
| Filter hidden until opened, type chips and city select (AC9) | ✅ `?type=THEATRE` → 3 theatre cards; plus Paris → `?type=THEATRE&city=75056`, 2 cards |
| Unknown and out-of-range URL parameters | ✅ `/?utm_source=x&page=99` shows "No upcoming event yet. Back to first page" and never sends the tracker to the API |
| Card opens the public page (UC22) | ✅ `/events/:id` |
| XSS seed title `<script>alert(1)</script>` | ✅ rendered as text |
| Mobile 375 px | ✅ no horizontal scroll; the header overlap is the known issue #285 |
| Cookies set by the agenda | ✅ none readable (`document.cookie` empty) |

Screenshots: [desktop](2026-10-28-public-agenda/01-home-agenda-desktop.jpg),
[type filter](2026-10-28-public-agenda/02-filter-theatre.jpg),
[mobile](2026-10-28-public-agenda/03-home-agenda-mobile.jpg).

Gate: **pass** after the `home.css` fix. No new issue was filed, because the defect was fixed in this branch.
