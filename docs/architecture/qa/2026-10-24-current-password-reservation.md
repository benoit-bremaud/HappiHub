# QA pass — current-password reservation, #329 (2026-10-24)

| Level | Head SHA | Environment | Targets | Agent / model |
|---|---|---|---|---|
| pass | c936b6f (`fix/329-current-password-reservation`) | local: API `http://127.0.0.1:5329`, CRA dev client `http://localhost:3329`, throwaway PostgreSQL 17.6 container on `127.0.0.1:55329` | A (API), W (account screen) | qa-tester · Opus 5.5 (product + SEC probes on the touched routes) |

Allowed hosts (rules of engagement): `localhost`, `127.0.0.1` only. No staging, no production.

## Plan

- Diff (`git diff main...HEAD --stat`): `server/controllers/accountController.js`
  (`requireCurrentPassword`), `server/utils/keyedLimiter.js` (`release`, `hit` removed), tests, docs.
  Oracle: [spec](../specs/current-password-reservation.md) R1–R5, AC329-1…4; brick D AC6/AC8/AC17.
- Domains in: FON (P0), DAT (P0 on the two routes), SEC (SEC-01…10 + SEC-12 on the touched
  routes), UI (account screen nominal + failure branch, 1440 and 390 widths).
- Domains out: A11Y, PERF, ROB, PRI, USA beyond the account screen (no UI or data-model change in
  the diff); MOB (no native target); ROB-11 (no firmware).

## Setup (isolated, test-only)

- Fresh `postgres:17.6-alpine` (digest pinned as in `docker-compose.yml`) container with a
  generated password, migrations applied with `npm run migrate` (10 tables), generated session
  secret and field keyring in the session scratchpad (never in the repository). Removed at the end.
- Accounts: throwaway `qa329-*@example.org` accounts created through `POST /api/signup` and
  verified with the token printed by the development log transport. Generated passwords; no value
  in this report.
- Deviation: no `.claude/launch.json` exists and this agent may not add config, so the API and the
  CRA dev server were run as background processes from Bash (logs in the scratchpad), not through
  `preview_start`. The API was restarted twice to reset the in-process per-IP sign-up quota
  (5 per hour), which the scenarios exceeded otherwise.
- Deviation: AC329-1 needs 8 truly concurrent requests, so that burst was not spaced 100 ms
  (8 calls, local tier, under the 20-call cap); a 100 ms-spaced variant was also run.

## Results

| ID | Check | Verdict | Evidence | Issue |
|---|---|---|---|---|
| FON-01 | Sign up → verify → sign in → account; email change and password change with the correct current password | PASS | API: sign-in 200 with a new session id; `PATCH` email 200 (`pendingEmail` set, 274 ms); `PATCH` password 200 (539 ms), same session still 200, old password sign-in 401, new password 200. UI: [01](2026-10-24-329-01-email-change-ok.jpg) "Saved. Confirm the new address…" | |
| FON-02 / AC329-1 | 8 parallel wrong-password `PATCH /api/account`, one session | PASS | `{403: 5, 429: 3}`; each 429 carries `Retry-After: 900` | |
| FON-02 (spaced) | Same, 100 ms apart (overlapping the ~250 ms compare) | PASS | `[403,403,403,403,429,403,429,429]` → 5 × 403, 3 × 429 | |
| FON-02 / R1 | A refused reservation answers without the compare | PASS | Sequential 429 latency 2, 13, 8 ms (vs ≥ 270 ms for a compare) | |
| FON-02 / AC329-3 | 4 wrong, 1 correct, 1 wrong, 1 wrong | PASS | `[403,403,403,403,200,403,429]` | |
| FON-02 / R2 | Successes never consume the quota | PASS | 6 sequential correct-password email changes: `[200 × 6]` | |
| FON-02 / UC6 | 8 parallel wrong-password `DELETE /api/account` | PASS | `{403: 5, 429: 3}`, `Retry-After: 900` × 3; account still there (`GET` 200); a correct-password delete during the window → 429 (refused before compare, as R1 states) | |
| FON-02 / R3, R5 | Per-account key across two sessions; missing password counts | PASS | Session 1: 3 wrong; session 2: 3 without `currentPassword`, all parallel → `{403: 5, 429: 1}`; a second session of a limited account gets 429 | |
| FON-02 | Limited account: change not needing the password | PASS | `PATCH {displayName}` → 200 while limited | |
| FON-02 | UI failure branch (account screen) | PASS | 5 × "The current password is incorrect.", 6th "Too many requests. Try again later." ([02](2026-10-24-329-02-limit-429.jpg)); delete form while limited shows the same message, account kept ([03](2026-10-24-329-03-delete-limited-mobile.jpg), 390 px) | |
| FON-02 / R4 | `release` after a window reset | NOT TESTED | Needs a 15-minute wait on the live product; covered by unit test AC329-2 | |
| DAT | Error bodies and status codes on both routes | PASS | 403 `{"message":"The current password is incorrect."}`, 429 `{"message":"Too many requests. Try again later."}`, 400 `{"message":"Invalid request","field":…}`; `Cache-Control: no-store` on every `/api` answer | |
| UI-02 | Console and network | PASS | No application error; console errors are only Chrome's "Failed to load resource" lines for the expected 403/429 answers; React Router v7 future-flag warnings and DOM autocomplete hints (dev noise) | |
| UI | Responsive 390 × 844 | PASS | No horizontal scroll (`scrollWidth` 390), [03](2026-10-24-329-03-delete-limited-mobile.jpg) | |
| UI | Progressive disclosure | PASS | "Current password" appears in the account form only after the email is edited | |
| SEC-01 | Security headers on `/api/account` | FAIL (pre-existing) | `X-Powered-By: Express`, no `X-Content-Type-Options` on 200/403/429 answers; `Referrer-Policy: no-referrer` and `no-store` present | #321 (open) |
| SEC-02 | Cookies | PASS (local) | `happihub.sid`: `HttpOnly; SameSite=Lax; Path=/; Expires` (+30 min idle); `document.cookie` empty; id changes at sign-in. `Secure` / `__Host-` is production-only, not observed here | |
| SEC-03 | Origin / CORS | PASS | Preflight with `Origin: https://evil.test` → ACAO is the configured origin, never the foreign one; `PATCH` with foreign, `null` or missing `Origin` → 403 | |
| SEC-04 | XSS | NOT TESTED | The diff renders no new field; last run PASS in [2026-10-24 inspector pass](2026-10-24-inspector-pass.md) | |
| SEC-05 | Authn / authz | PASS | `PATCH` and `DELETE /account` without a session → 401; no id in the route, a smuggled `id` field → 400 | |
| SEC-06 | Input limits | PASS | Bad email, unknown field, numeric password, 5 000-char password → 400; 200 KB body → 413; text/plain → 415; server stayed up. Refused requests (13 of them: CSRF, origin, type, validation) did **not** consume the quota: the next 6 wrong passwords gave 5 × 403 then 429 | |
| SEC-07 | Rate limits | PASS | The #329 bound holds under concurrency (above); other accounts unaffected (each scenario account started with a full quota) | |
| SEC-08 | Error leaks | PASS on the touched routes; FAIL (pre-existing) elsewhere | No stack, path or SQL in any 4xx body above. Unknown `/api/nope` still answers Express's HTML 404 | #322 (open) |
| SEC-09 | Bundle | NOT TESTED | No client change in the diff; production build not run at this level | |
| SEC-10 | Third parties | PASS | Hosts seen: `localhost:3329`, `localhost:5329`, `stackpath.bootstrapcdn.com` (Bootstrap CSS with SRI, documented in [edge-security-headers](../specs/edge-security-headers.md)) | |
| SEC-12 | Sign-out invalidates the session | PASS | `DELETE /session` 204, replaying the old cookie on `GET /account` → 401 | |
| Inspector | Storage | PASS | localStorage, sessionStorage empty; session cookie not readable from JS | |
| Logs | Server log | PASS | Filtered (`grep -v` of `[outbox]` lines and Node ESM warnings): no error, no stack. The dev log transport prints verification links with their token, which is the documented development-only behaviour | |

## Not covered

- R4 (release across a window reset): NOT TESTED live, unit test AC329-2 covers it.
- SEC-04, SEC-09: NOT TESTED, out of the diff (see rows). SEC-11, SEC-13…: not run at level `pass`
  for this diff.
- Production cookie flags (`Secure`, `__Host-`) and the nginx edge: not observed (local HTTP only).
- A11Y, PERF, ROB, PRI: no UI or data change in the diff.

## Findings

No new defect introduced by #329. All acceptance criteria AC329-1…3 observed on the running
product; AC329-4 (existing UC4/UC6 behaviour) observed for the nominal and limited paths.

1. 🔵 Nice — Concurrent **correct**-password requests beyond the quota can get 429 (R1
   consequence). Seen: 7 parallel correct-password email changes → 6 × 200, 1 × 429. Expected by
   design (the reservation is taken before the compare), but the spec states "successes never
   consume the quota" without this nuance. Suggested fix: one sentence in the spec R2, e.g.
   "More than 5 simultaneous in-flight checks on one account are refused even when correct."
   No user can do this from the UI (one request per click). No issue proposed unless the owner
   wants the wording.
2. 🔵 Nice — The UI 429 message gives no wait time ("Too many requests. Try again later.") while
   the API sends `Retry-After` (up to 900 s). Pre-existing, not from this diff. Proposed issue:
   `fix(client): show the wait time from Retry-After on 429 answers` (labels: bug, frontend,
   priority: P3).
3. 🔵 Nice — A `currentPassword` longer than 1 024 characters gets a 400 whose `hint` is the
   new-password rule ("Use 15 to 64 characters…"). Same root cause as open #323 (the hint is
   attached to every 400 of `PATCH /account`). Proposed: a comment on #323 adding this case, no
   new issue.
4. Pre-existing, already tracked, out of this diff: SEC-01 (`X-Powered-By`, no `nosniff`) → #321;
   SEC-08 (HTML 404 on unknown `/api` routes) → #322. Both P0 checklist items still FAIL; the
   owner prioritised them P3. They do not come from #329.

Observation (not a defect): the fixed window starts at the first reservation, success included.
The UI account opened its window with a successful change, so its later 429 said
`Retry-After: 796`, not 900. This matches R4 and the fixed-window design (ADR-0001).

## Proposed issues (not filed, per caller instruction)

| Title | Labels | Note |
|---|---|---|
| `fix(client): show the wait time from Retry-After on 429 answers` | bug, frontend, priority: P3 | Finding 2 |
| Comment on #323 | — | Finding 3 |
| (optional) `docs(spec): note that simultaneous correct checks can be refused (#329 R2)` | documentation | Finding 1, only if the owner wants it |

No security finding needs a private advisory.

## Delta vs previous report

[2026-10-24-inspector-pass.md](2026-10-24-inspector-pass.md): #321 and #322 still failing, #319
and #320 closed (not re-tested here: nginx edge and production bundle out of scope), new defects 0.

## Gate line

```
| 5 QA pass | ✅ pass (0 Must, 0 Should, 3 Nice) · journey: sign up → verify → sign in → email + password change → 8 parallel wrong PATCH (5×403, 3×429 + Retry-After) → 8 parallel wrong DELETE (5×403, 3×429) → UI limited state · inspector: console clean (expected 4xx only), network clean, storage ok · security SEC-01…10: 6 ✅, SEC-01 ❌ #321 and SEC-08 ❌ #322 (pre-existing, owner P3), SEC-04/09 not tested (out of diff) · domains: FON, DAT, UI, SEC · report: docs/architecture/qa/2026-10-24-current-password-reservation.md |
```
