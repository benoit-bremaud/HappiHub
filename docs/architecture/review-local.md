# Local review — HappiHub (#252 event client)

- Date: 2026-10-22
- Commit: 6c1fc4d
- Scope: branch diff `origin/main...feat/252-event-client`
- Checks run: design · docs · tests · security · correctness
- Verdict: ship as-is · Must 0 · Should 0 · Nice 2 (open in the backlog)

## Pre-merge gate (head SHA 6c1fc4d)
| Step | Result |
|---|---|
| 1 Tests | ✅ server unit 69 · ✅ server integration 98 (PostgreSQL) · ✅ client 84 · ✅ client build |
| 2 Coverage | server integration 93.32 % stmts / 76.03 % branches / 97.82 % funcs / 95.2 % lines · client 92.61 % / 81.99 % / 93.61 % / 96.09 % · new-code coverage 95.1 % (Sonar) |
| 3 SonarQube | ✅ PASSED (first run FAILED with 147 new issues, all fixed in 0c7d6ab) |
| 4 Secrets | ✅ gitleaks clean (`origin/main..HEAD`) · no tracked .env · diff read: synthetic data only |
| 5 QA pass | ✅ full, see [browser QA](qa/2026-10-22-252-browser-qa.md) · console clean except an expected 422 · 14 screenshots |
- Gate: **GREEN — merge can be requested**

## 🔴 Must Have
- Resolved: `docs/architecture/diagrams/v1-event-client/03-component.md` `[design]` · the diagram did not match the code → updated with EventSteps, StepPreview, InPlaceSignIn and the `refreshSession` callback.
- Resolved: `client/src/events/events.test.jsx` `[tests]` · CC8 and CC10 were missing → assertions added: no account data on the public page; delete goes back to the list; a published event has no Delete.
- Resolved: `client/src/events/EventListPage.jsx:51` `[correctness]` (QA) · a member without a display name was shown as "former member" → amendment A-B6, `lastEditedByFormerMember`.

## 🟡 Should Have
- Resolved: `client/src/events/*` `[security]` · URL parameters were not encoded → `encodeURIComponent` added.
- Resolved: `docs/API_DOCUMENTATION.md` `[docs]` · `/api/communes` was undocumented → section added.
- Resolved: `events.test.jsx` `[tests]` · CC6, CC11, CC12 and XSS cases → covered.

## 🔵 Nice to Have
- `client/src/events/useEventEditor.js` `[correctness]` · apply the published-required rule locally to avoid a refused PATCH (backlog 3).
- `client/src/events/*.test.jsx` `[tests]` · act / router future-flag warnings (backlog 6).

## ⚪ Disagree / Intentional
- `client/src/events/StepPreview.jsx:1` `[correctness]` · `/* global globalThis */` because CRA ESLint lacks ES2020 globals; Sonar asks for `globalThis`.

## Per-dimension summary
- Design: flat events folder; the hook is the single API seam · Docs: spec, diagrams and API docs updated · Tests: CC1–CC15 covered · Security: encoded params, plain-text rendering, no account data exposed · Correctness: QA bug fixed (A-B6), 8 follow-ups logged.
