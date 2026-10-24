# Local review — HappiHub (#319 + #320 edge security headers and source maps)

- Date: 2026-10-24
- Commit: 96e2762 + Referrer-Policy fix (head of `fix/319-320-nginx-security-headers`)
- Scope: branch diff `main...fix/319-320-nginx-security-headers`
- Checks run: design · docs · tests · security · correctness (one combined Opus pass, proportional
  to a config-only diff: `client/nginx.conf`, `client/Dockerfile`, docs)
- Verdict: ship  ·  Must 0 · Should 1 ✅ · Nice 2 ✅ · Disagree 1

## Pre-merge gate

| Step | Result |
|---|---|
| 1 Tests | ✅ client 84/84 · server unit 142/142 · no product code changed (integration suite unaffected, not rerun) |
| 2 Coverage | client 92.61 % stmts / 81.99 % branches / 93.61 % funcs / 96.09 % lines · docs unchanged (no code) |
| 3 SonarQube | ✅ main gate OK (new coverage 94.4 %, 0 violations); the diff touches no `sonar.sources` path |
| 4 Secrets | ✅ gitleaks clean (origin/main..HEAD) · no tracked .env · diff read: nothing sensitive |
| 5 QA pass | ✅ smoke on the built runtime image: six headers on `/`, SPA route, `/api/` (403) and a missing asset; `Server: nginx` without version; 0 `.map` files; 0 inline `<script>`; SPA renders with Bootstrap and no CSP violation in the console |

Also: Hadolint clean on `client/Dockerfile`.

- Gate: **GREEN** for push; merge after owner approval.

## 🔴 Must Have
_None._

## 🟡 Should Have
- `client/nginx.conf` `[security]` · Express already sends `Referrer-Policy: no-referrer`
  (`server/app.js:49`); a weaker edge value would win on `/api` · ✅ edge set to `no-referrer`
  (owner MCDA A 480/500), spec updated.

## 🔵 Nice to Have
- `docs/architecture/specs/edge-security-headers.md` `[docs]` · document the `/api` interaction · ✅ done.
- Same spec `[tests]` · verify an `/api/` response and an error path too · ✅ added and run.

## ⚪ Disagree / Intentional
- CSP `img-src data:` and `font-src 'self'` · kept: Bootstrap 4.5 uses `data:` SVG backgrounds.

## Per-dimension summary
- Design: server-block headers only, minimal. · Docs: spec matches the code. · Tests: manual curl/find
  checks fit an infra change. · Security: closes S1 and S9. · Correctness: nothing breaks the SPA.
