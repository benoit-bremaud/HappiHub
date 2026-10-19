# Local review — HappiHub (brick B)

- Date: 2026-10-19
- Commit: 4a1059c plus the commit that adds this report (feature 13e2654, fixes 3270cb4 and 4a1059c)
- Scope: branch diff origin/main...feat/brick-b-event-lifecycle (server only, spec v1-brick-b-event-lifecycle)
- Checks run: design · docs · tests · security · correctness · QA pass (API)
- Verdict: Must Have resolved; gate green · Must 0 open (4 fixed) · Should 0 open (fixed) · Nice 5 deferred

## Pre-merge gate
| Step | Result |
|---|---|
| 1 Tests | ✅ server 65 unit + 97 integration (disposable PostgreSQL 17.6, three consecutive green runs) · ✅ client 36 |
| 2 Coverage | server integration 93.5 % stmts / 76.3 % branches / 97.8 % funcs / 95.1 % lines · `domain/event.js` 100 % lines · SonarQube new code 87.7 % · docs: 45/45 exports of the brick B modules documented (no counter tool in this repo) |
| 3 SonarQube | ✅ QUALITY GATE PASSED on 4a1059c (local SonarQube, project `happihub`, server unit + integration and client lcov reports) |
| 4 Secrets | ✅ gitleaks clean on origin/main..HEAD · no tracked .env · diff read: only synthetic QA accounts and the INSEE open data file (Etalab 2.0) |
| 5 QA pass | ✅ API flow on the running server and a disposable database (no UI in this brick): 14 calls, every status as expected, server log free of errors, no session cookie or CSRF token in the transcript · `docs/architecture/qa/2026-10-19-brick-b-api-flow.md` |
- Gate: **GREEN — merge authorised pending owner approval**

## 🔴 Must Have (all fixed)
- `server/tests/integration/events.test.js` BC15 `[tests]` · export order of two events created at the same fixed instant was random → order-free assertion plus row checks (3270cb4).
- `server/services/events.js` recordEdit `[correctness|tests]` · coalescing picked "the latest entry" by random uuid when entries shared an instant (BC18 flaked about one run in two) → coalesce into the actor's latest edit unless a strictly later entry exists (4a1059c).

- `server/services/events.js` lockMemberWrite `[correctness]` · publish locked association then account while UC6 deletion locks account then association (deadlock, 500) → every event write now locks the account first; race regression test. Found on PR #282, verified against `deleteAccountRow`.
- `server/migrations/1760832000000_brick-b-events.sql` `[correctness]` · `ends_at` with a null `starts_at` passed the CHECK (NULL result) → `starts_at IS NOT NULL` required; BC17 row added.

## 🟡 Should Have (all fixed in 3270cb4 / 4a1059c)
- `server/services/events.js` `[security]` · membership re-checked under lock on every write, not only publish; regression test for a member removed mid-flight.
- `server/domain/event.js` `[security]` · dates need a zone and a real calendar day (numbers and Feb 30 refused); invisible formatting characters (`Cf`, `Zl`, `Zp`) refused; strict uuid in the controller.
- `server/services/events.js` `[correctness]` · views computed inside the transaction; null-safe account read in publish; activity lists only changed fields; empty edits add no entry.
- `server/services/events.js` `[correctness]` · stale draft scan bounded (`LIMIT 500` per run); `DRAFT_NOTICE_GRACE_MS` constant.
- `server/services/events.js` `[design]` · boolean-flag lock helper replaced by `lockMemberWrite(..., {exclusive})`; shared `EVENT_SOURCE` join; statuses and the reason schema moved to the domain; `quotaError`.
- `docs/API_DOCUMENTATION.md`, `server/domain/errors.js` `[docs]` · public projection, `INVALID_REQUEST`, details contract, separate limiter counters, `@throws` on refusing functions.
- Tests `[tests]` · BC14 renamed, BC15 author nulls, BC16 hidden Unicode and numeric dates, BC18 new entry after publish or another editor.
- SonarQube `[correctness]` · optional chain in the date validator; explicit sort compare.

## 🔵 Nice to Have (deferred, follow-up issues proposed)
- `server/domain/event.js` mergeEdit `[correctness]` · a stale save whose value equals the current one still conflicts (spec § 5 step 3 as written); spec revision proposal.
- `server/services/events.js` runEventMaintenance `[design]` · notice emails queued one row per member; batch if associations grow.
- `server/services/errors.js` `[design]` · re-export kept for brick D imports; remove once they import `domain/errors.js`.
- `server/domain/event.js` `[design]` · `DAY_MS` duplicated with brick D constants.
- Lock ordering `[correctness]` · closure (association then events) and writes share the order; document it in the component diagram.

## ⚪ Disagree / Intentional
- HTTP status in `DomainError` · existing brick D pattern, not changed in this brick.
- Joi in the domain · field rules are domain rules (spec § 7); Joi is the existing validation library.
- `POST .../delete` instead of `DELETE` · spec § 5 route table (body with `confirm` and `baseVersion`).
- Per-IP limiters 600 / 15 min · owner decision A-B4 (spec § 12, MCDA 390).

## Per-dimension summary
- Design: flat domain + service split fits the size; no Must. · Docs: API doc and spec amendments A-B1–A-B4 current. · Tests: every BC1–BC19 covered, flake removed. · Security: allow-list, constant SQL, locks and public projection verified. · Correctness: lifecycle and merge rules match the spec.
