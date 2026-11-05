# Shared useSend hook — refactoring conception

Status: validated by the owner on 2026-11-05 (D1 = A); implemented. Date: 2026-11-05. Work item: issue #368.
This note specifies one client hook that replaces five copies of the same fetch-with-cancel
effect, without changing any screen's visible behaviour or the API contract.

## Evidence

Five effects repeat `let current = true; void (async () => { … await send(path) … })();
return () => { current = false; };` (verified at 89bab08):

| File | Request | Specifics |
|---|---|---|
| `events/PublicEventPage.jsx:13` | `/events/:id` | maps 404 to a message |
| `events/Agenda.jsx:44` | `/events?…` | resets to loading on path change; retry via `attempt` |
| `events/AgendaFilters.jsx:15` | `/events/cities` | only once the panel is open |
| `events/EventListPage.jsx:19` | `/associations/:slug/events` | only when authenticated; keeps the old list while a new filter loads |
| `events/CityPicker.jsx:18` | `/communes?q=` | 250 ms debounce; idle below 2 letters |

`send()` (`accounts/request.js`) never throws, so the hook needs no error branch.

## Design

```js
// client/src/accounts/request.js (next to send)
export const useSend = (path, { delay = 0 } = {}) => ({ response, retry })
```

- `path`: the GET path, or `null` to stay idle (closed panel, anonymous session, short query).
- `response`: the raw `send()` result `{ ok, status, data }` of the current `path`, or `null`
  while loading or idle. A response from a previous path is never returned (see decision D1).
- `retry()`: sends the same path again (Agenda "Try again").
- `delay`: milliseconds to wait before sending; a new path cancels the pending timer (CityPicker).
- Cleanup: a late response after a path change or unmount is ignored, as today.

Each screen keeps its own mapping from `response` to what it renders (404 message, `data.events`,
`data.communes`), so the hook stays ignorant of screens (single responsibility).

## Decision D1 — what a screen sees while a new path loads

| Criterion (weight) | A: always `null` (reset) | B: keep the previous response | C: option flag `keepPrevious` |
|---|---|---|---|
| Correctness, never shows another key's data (35) | 5 — by construction | 2 — old event under a new id | 4 — correct unless misused |
| Behaviour parity of the 5 screens (25) | 3 — EventListPage hides its "All" chip set during a reload | 3 — Agenda/PublicEventPage lose their reset | 5 — every screen unchanged |
| Simplicity, KISS/YAGNI (25) | 5 | 5 | 3 — one more option for one caller |
| Testability (15) | 5 | 4 | 3 |
| **Total /500** | **450** | 340 | 410 |

Sensitivity: A stays first until parity weighs over 45 %. Recommendation: A. The
EventListPage side effect is fixed in the screen, not the hook: its chip set shows when
`filter` is set or the last loaded list had more than one event, held in local state (one line).

## Out of scope

Mutations (POST/PATCH), caching, a data-fetching library, server changes.

## Acceptance criteria

- AC1 `useSend` returns `{ response: null }` while loading, then the `send()` result.
- AC2 `path === null` sends nothing and returns `null`.
- AC3 a path change or unmount ignores the earlier request's late response.
- AC4 `retry()` sends the same path again and shows loading meanwhile.
- AC5 `delay` waits before sending and a change within the delay sends only the last path.
- AC6 the five screens use the hook; `grep "let current = true" client/src` finds nothing.
- AC7 existing client tests stay green unchanged, apart from EventListPage's chip test if needed;
  `npm run build` passes.

No UML diagram: the change has no new actor, component boundary or state worth modelling;
the table above is the contract.
