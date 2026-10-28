# Local review — HappiHub (#366 public agenda)

- Date: 2026-10-28
- Commit: 4100c11
- Scope: branch diff main...feat/366-public-agenda
- Checks run: design · docs · tests · security · correctness
- Verdict: fix Must Have first · Must 3 · Should 8 · Nice 5

## Pre-merge gate (head SHA 4100c11)

| Step | Result |
|---|---|
| 1 Tests | ✅ server unit 161 · ✅ server integration 169 · ✅ client 88 · ✅ client build |
| 2 Coverage | server integration 90.9 % stmts / 75.0 % branches / 96.2 % funcs / 93.3 % lines; client 92.9 / 82.5 / 93.8 / 96.2 · docs ≈100 % of the new public surface (doc-auditor estimate) |
| 3 SonarQube | ❌ FAILED: 3 new violations (nested template literal `Agenda.jsx:22`; `[0-9]` → `\d` twice `eventController.js:29`) |
| 4 Secrets | ✅ gitleaks clean (main..HEAD, 4 commits) · no tracked .env · diff read: nothing sensitive |
| 5 QA pass | ✅ pass after a home.css fix (agenda top unreachable) · report: docs/architecture/qa/2026-10-28-public-agenda.md |

- Gate: RED at 4100c11 (SonarQube, Must Have open); all Must and Should items except the `useSend` follow-up fixed in 89fd589 and later; see the final gate below.

## 🔴 Must Have

- `client/src/events/Agenda.jsx:15,22` `[design|security|correctness]` · the raw browser query string is forwarded to the API; `?utm_source=x`, `?page=0` or `?page=99` breaks the agenda (400) and Retry never recovers · build the API query only from parsed `type`, `city` and clamped `page`; add a test with an unknown parameter.
- `server/tests/integration/agenda.test.js` `[tests]` · AC11 (publicReads limiter on both routes) untested · assert `RateLimit` headers on both routes.
- `server/tests/integration/agenda.test.js:66-78,94-101` `[tests]` · AC3 ordering oracle is circular (sorted from the response with `localeCompare`); AC6 has no leak canary · compare against inserted ids with a byte-order sort; assert the address never appears.

## 🟡 Should Have

- `server/services/events.js:251-255` `[design]` · third copy of the A1 "not ended" SQL · one `notEnded` helper reused by the agenda and `cancelUpcomingEvents`.
- `server/services/events.js:41,261` `[design]` · city view mapped twice with diverging null shapes · one `cityView` helper.
- `server/controllers/eventController.js:29` `[design|sonar]` · INSEE regex re-implemented; accepts unknown communes · reuse the domain `commune` schema.
- `client/src/events/Agenda.jsx:40-58` `[correctness]` · an empty page past the end leaves no way back · offer "Back to first page".
- `client/src/events/Agenda.jsx:48` `[a11y]` · `aria-label` hides date/city/status from screen readers · drop it.
- `agenda.test.js` / `agenda.test.jsx` `[tests]` · gaps: time boundaries, cities exclusions, AC8 card content, vacuous negative `fetch` assertion, no "Clear filters" without filters.
- `docs/architecture/specs/public-agenda.md:96,98` `[docs]` · "links" are buttons; deep-linked filters open the panel · align text.
- client fetch-with-cancel effect now in five files `[design]` · follow-up issue for a `useSend` hook (not in this PR).

## 🔵 Nice to Have

- `events.js:270` dead defaults repeating Joi · `events.js:245` needless `AGENDA_PAGE_SIZE` export · `Agenda.jsx:36` needless wrapper · `AgendaFilters.jsx:32` city missing from list shows "All cities" · no index for type/city filters (fine at current volume).

## ⚪ Disagree / Intentional

- `cardView` built from the raw row, not the member view: spec § 5 allow-list.
- Page-number pagination: MCDA D2-A.
- SUSPENDED association fixture: the schema only has ACTIVE/CLOSED today.

## Per-dimension summary

- Design: no over-engineering; one leaky URL→API coupling, three Rule-of-Three duplications.
- Docs: consistent with code; two stale sentences.
- Tests: right pyramid; AC11 missing, AC3 oracle circular.
- Security: SQL parameterised, no privacy leak, routes ordered, limiter present.
- Correctness: unknown/out-of-range URL params break the page; past-end page dead end.
