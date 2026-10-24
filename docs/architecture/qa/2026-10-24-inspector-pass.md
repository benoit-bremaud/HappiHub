# Inspector and security QA pass — 2026-10-24

- Commit: main `b1445c5` (after #310 database encryption)
- Stack: local API (port 5000) + CRA dev client (port 3001) + PostgreSQL 16 container; Claude in Chrome and curl
- Method: skill `qa-browser-check` § Inspector review and security probes S1–S10

| # | Probe | Result | Backlog |
|---|---|---|---|
| S1 | Security headers | ❌ API: `X-Powered-By: Express`, no `nosniff`. nginx: no security header at all (CSP, XFO, nosniff, Permissions-Policy, HSTS), and `server_tokens` is on | #321, #319 |
| S2 | Cookies | ✅ Local cookie `happihub.sid` is HttpOnly, SameSite=Lax, path `/`, with an expiry; production uses `__Host-happihub.sid` with Secure (config, not observed) | — |
| S3 | CORS | ✅ A foreign origin gets no permissive ACAO; a write from it gets 403 | — |
| S4 | XSS | ✅ Payloads in display name, city and presentation render as text; a `javascript:` website is refused with 400 ([screenshot](2026-10-24-01-xss-as-text.jpg)) | — |
| S5 | Authn / authz | ✅ No session gets 401; no CSRF token gets 403; another user's association gets 404 (no IDOR); a mass-assigned `platformRole` gets 400 | — |
| S6 | Input limits | ✅ Wrong types, long values and a 200 KB body are refused (400/413). ❌ The display-name error shows the password hint | #323 |
| S7 | Rate limits | ✅ 429 after 5 attempts per IP+email, and the per-IP limit works; other sessions are unaffected | — |
| S8 | Error leaks | ❌ An unknown `/api` route returns Express's HTML 404, which echoes the path; no stack trace | #322 |
| S9 | Bundle | ❌ Source maps are built and copied into the nginx image; no secret found | #320 |
| S10 | Third parties | ✅ Only the API host is contacted | — |

Inspector panels:
- Console: no error from our code; only noise from browser extensions.
- Network: `no-store` and `no-referrer` are set on `/api`.
- Storage: local storage, session storage and IndexedDB are empty.
- Forms: autocomplete, labels and required are correct.
- Hygiene: the meta description is the CRA default (#324), and the tab title is "React App" (already tracked in #287).
