# Shared useSend hook — refactoring conception

Status: validated by the owner on 2026-11-05 (D1 = A), revalidated the same day as D1 = C after
the pre-push review corrected the parity facts; implemented. Date: 2026-11-05. Work item: issue #368.
This note specifies one client hook that replaces five copies of the same fetch-with-cancel
effect, without changing any screen's visible behaviour or the API contract.

## Evidence

Five effects repeat `let current = true; void (async () => { … await send(path) … })();
return () => { current = false; };` (verified at 89bab08):

| File | Request | Specifics |
|---|---|---|
| `events/PublicEventPage.jsx:14` | `/events/:id` | maps 404 to a message; keeps the old event if `id` changes |
| `events/Agenda.jsx:45` | `/events?…` | resets to loading on path change; retry via `attempt` |
| `events/AgendaFilters.jsx:16` | `/events/cities` | only once the panel is open; keeps the list on reopen |
| `events/EventListPage.jsx:20` | `/associations/:slug/events` | only when authenticated; keeps the old list while a new filter loads |
| `events/CityPicker.jsx:19` | `/communes?q=` | 250 ms debounce; idle below 2 letters; keeps results and alert while typing |

`send()` (`accounts/request.js`) never throws, so the hook needs no error branch.

## Design

```js
// client/src/accounts/request.js (next to send)
export const useSend = (path, { delay = 0, keepPrevious = false } = {}) => ({ response, retry })
```

- `path`: the GET path, or `null` to stay idle (closed panel, anonymous session, short query).
- `response`: the raw `send()` result `{ ok, status, data }` of the current `path`, or `null`
  while loading or idle. By default a response from another run is never returned; a revisited
  path loads again.
- `keepPrevious`: the last loaded response stays until the new one lands (decision D1).
- `retry()`: sends the same path again (Agenda "Retry").
- `delay`: milliseconds to wait before sending; a new path cancels the pending timer (CityPicker).
- Cleanup: a late response after a path change or unmount is ignored, as today.

Each screen keeps its own mapping from `response` to what it renders (404 message, `data.events`,
`data.communes`), so the hook stays ignorant of screens (single responsibility).

## Decision D1 — what a screen sees while a new path loads

Round 1 scored A first (450) on incomplete facts. The pre-push review showed three screens keep
the previous data today (table above), so A would change them visibly. Revalidated scores:

| Criterion (weight) | A: always reset, accept the changes | A′: reset, hold in each screen | C: option `keepPrevious` |
|---|---|---|---|
| Correctness, never shows another key's data (35) | 5 | 5 | 4 — previous data shown knowingly while loading |
| Behaviour parity of the 5 screens (25) | 1 — CityPicker list flickers per keystroke, two loading flashes | 5 | 5 |
| Simplicity, KISS/YAGNI (25) | 5 | 2 — the same hold copied in two screens | 4 — one option, three callers |
| Testability (15) | 5 | 3 | 4 |
| **Total /500** | 400 | 395 | **425** |

Sensitivity: A passes C only if parity weighs under about 15. Decision: C. CityPicker,
EventListPage and AgendaFilters pass `keepPrevious`; Agenda and PublicEventPage reset.

## Out of scope

Mutations (POST/PATCH), caching, a data-fetching library, server changes.

## Acceptance criteria

- AC1 `useSend` returns `{ response: null }` while loading, then the `send()` result.
- AC2 `path === null` sends nothing and returns `null`.
- AC3 a path change or unmount ignores the earlier request's late response.
- AC4 `retry()` sends the same path again and shows loading meanwhile.
- AC5 `delay` waits before sending and a change within the delay sends only the last path.
- AC6 the five screens use the hook; `grep "let current = true" client/src` finds only
  `accounts/request.js`.
- AC7 existing client tests stay green unchanged; `npm run build` passes.
- AC8 with `keepPrevious` the last loaded response stays until the new path's reply lands.

No UML diagram: the change has no new actor, component boundary or state worth modelling;
the table above is the contract.
