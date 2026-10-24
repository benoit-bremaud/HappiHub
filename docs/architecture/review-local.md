# Local review — HappiHub (branch docs/251-test-environment-study)

- Date: 2026-10-24
- Commit: ae3047a + review fixes
- Scope: branch diff main...HEAD (docs only: test-environment spec, 3 diagrams, log, handover)
- Checks run: correctness and security (spec claims against the server code), docs (links, Mermaid), secrets
- Verdict: ship after the fixes below (all applied) · Must 4 · Should 6 · Nice 4, all resolved

## Pre-merge gate
| Step | Result |
|---|---|
| 1 Tests | not applicable: no code changed (docs-only diff); last full run on main recorded in the 2026-10-24 global review |
| 2 Coverage | unchanged (no code) |
| 3 SonarQube | not run: no analysable source in the diff |
| 4 Secrets | ✅ gitleaks clean (main..HEAD) · tracked env files are the `.env.example` placeholders only · diff read: no credential, all addresses on `.test` |
| 5 QA pass | smoke not applicable: no runtime change |
- Gate: **GREEN for a docs merge**

## 🔴 Must Have (fixed)
- `specs/test-environment.md` § 5 R-AUTH-6 `[correctness]` · unverified accounts cannot sign in (`services/accounts.js:78`) · now 401 + resend case
- § 5 R-SIGN-2 `[correctness]` · password rule 15–64 chars, ≤ 72 bytes, blocklist (`domain/password.js`) · cases written
- § 5 R-EVT-3/6/7 `[correctness]` · 422 `PUBLICATION_REFUSED`, `STALE_VERSION` vs `EDIT_CONFLICT`, 404 for non-members · corrected
- § 4.2 / § 7 `[design]` · E12, E16–E19 unreachable through services alone · owner decision D6 A (460/500): seed clock + maintenance job, SQL only for the moderation flag

## 🟡 Should Have (fixed)
- § 4.2 E14 `[correctness]` · `20A00` violates the CHECK · `2A004` (Ajaccio, in `communes.json`)
- § 5 `[correctness]` · 413/429 thresholds, 403 wrong current password, 409 quota, 410 invitations, 400 `UNKNOWN_FIELD`
- § 4.2 `[correctness]` · `EVENT_QUOTA` 20/24 h · documented + AC8
- § 8 `[design]` · slugs are derived · namespace by `Demo ` name prefix
- § 4.1 `[docs]` · persona troupe name aligned with v1-personas.md
- § 11 `[security]` · `.gitignore` entry made an explicit AC7

## 🔵 Nice to Have (fixed)
- E12 effective-end wording · guard 5 testable (no `DATABASE_URL_PROD`) · Mermaid `--confirm` label quoted · links verified

## ⚪ Disagree / Intentional
_None._

## Per-dimension summary
- Design: D6 added · Docs: links and diagrams valid · Tests: none in diff · Security: sound, guard tightened · Correctness: catalogue aligned with the code
