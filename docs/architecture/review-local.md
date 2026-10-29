# Local review — HappiHub (#382 cultural poster)

The pre-merge gate run on the branch `feat/382-cultural-poster-design` before its pull request.

- Date: 2026-10-29
- Scope: branch diff `origin/main...HEAD`, covering client/src and docs.
- Checks run: design · docs · tests · security · correctness
- Verdict: ship. Must 0 open (1 fixed) · Should 0 open (4 fixed) · Nice 2 filed (#383, #384).

## Pre-merge gate

| Step | Result |
|---|---|
| 1 Tests | ✅ client 100 · ✅ server unit 164 · ✅ server integration 222 (1 todo) |
| 2 Coverage | Client: 94.5 % statements, 83.9 % branches, 95.1 % functions, 98.1 % lines. Server integration: 93.2 % statements, 82.6 % branches. Docs: ⚠️ no project counter; the doc-auditor pass found every new unit documented |
| 3 SonarQube | ✅ PASSED after the duplicate `.hh-poster` selector was fixed (first scan FAILED: new_violations 1) |
| 4 Secrets | ✅ gitleaks clean on `origin/main..HEAD` · no tracked `.env` · diff read: nothing sensitive (the font is an OFL file) |
| 5 QA pass | ✅ automated pass at 320 to 1440 px: axe reports 0 violations; C3, C4, V1, V5 and V7 checked ([report](qa/2026-10-29-382/README.md)) · owner QA validated on 2026-10-29 |

- Gate: **GREEN**

## 🔴 Must Have

- `client/src/accounts/accounts.css:11`, `client/src/events/events.css` `[design]` · Hard-coded `#fff` breaks C2 and D6. **Fixed:** a new `--hh-on-accent` role token.

## 🟡 Should Have

- `client/src/components/Header/Header.jsx:21` `[security/a11y]` · No `<h1>` was left on any page. **Fixed:** the wordmark is the `<h1>` again, as it was before the change.
- `client/src/events/eventFields.js` `[design]` · `'en-GB'` was repeated 6 times. **Fixed:** one `LOCALE` constant, plus a `monthShort` helper used by the poster.
- `client/src/events/Agenda.jsx` `[design]` · The JSX was nested too deep and the cancelled check was written twice. **Fixed:** an `AgendaCard` component.
- `client/src/events/agenda.test.jsx` `[tests]` · No test covered a day that comes back later in API order or the range at card level. **Fixed:** a new test, which also exposed duplicate React keys (now keyed by the day's first event).

## 🔵 Nice to Have

- `client/src/events/eventFields.js` `dayHeading` `[correctness]` · No year at a year boundary → #383.
- `client/public/index.html:7` `[security]` · Third-party Bootstrap CDN (it predates this change), plus a VoiceOver check of `display: contents` → #384.
- Fixed in passing: the date block is now a `div`, which removes a margin override; the unused `className="content"` is gone; the `dayHeading` comment is reworded.

## ⚪ Disagree / Intentional

- `client/src/events/PublicEventPage.jsx` · The poster badge is dropped on the public page (A1, study § 8.2).
- `client/src/events/events.css` · `display: contents` with visually hidden day headings from 48 rem (A2, study § 8.3).
- `client/src/events/agenda.test.jsx` · The Home test stays in the agenda test file, which already fakes the agenda API.

## Per-dimension summary

- **Design:** no over-engineering; the token leak is fixed.
- **Docs:** the new units are documented and accurate.
- **Tests:** a healthy pyramid; only `fetch` is faked.
- **Security:** no XSS and no new third-party request.
- **Correctness:** the date logic is checked, and the duplicate keys are fixed.
