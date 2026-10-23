# Local review — HappiHub (#310 encryption-at-rest conception study)

- Date: 2026-10-23
- Commit: a907bdb + review fixes (next commit)
- Scope: branch diff origin/main...HEAD, documentation only
- Checks run: design · docs · security · correctness (one Opus reviewer covering all four); tests
  dimension not applicable (no test or code file in the diff)
- Verdict: ship after fixes · Must 3 (fixed) · Should 4 (fixed) · Nice 3 (2 fixed, 1 accepted)

## Pre-merge gate (docs-only diff)

| Step | Result |
|---|---|
| 1 Tests | ✅ server unit 97/97, integration 98/98, client 84/84 |
| 2 Coverage | not applicable (no code); doc coverage unchanged |
| 3 SonarQube | ✅ PASSED (three lcov reports, 2026-10-23) |
| 4 Secrets | ✅ gitleaks clean (origin/main..HEAD) · no tracked .env · diff read: placeholders only |
| 5 QA pass | not applicable before the PR; Mermaid diagrams render (`mmdc`), links resolve |

- Gate: green except step 5, not applicable to a docs-only diff (no runtime change).

## 🔴 Must Have

- `specs/db-encryption-at-rest.md` § 8 `[correctness]` · `services/events.js` (editor name, draft-cleanup emails) missing · added a row, and corrected § 16.1. **Fixed.**
- § 7 `[security]` · `jobs/migrate.js` not covered by the TLS rule · moved the check into one `config/` helper called by all three entry points. **Fixed.**
- § 6.2, `04-state-key.md` `[security|design]` · switching to the new key in one step breaks processes still on the old keyring · added a staged step (decrypt-only, restart everywhere, then activate). **Fixed.**

## 🟡 Should Have

- § 10 D1 `[docs]` · sensitivity figure was wrong · now reads A' 415 vs A 390 with wish 30, KISS 5. **Fixed.**
- ADR-0004 `[docs]` · D1 fallback misnamed · aligned on A' 385. **Fixed.**
- § 7 `[security]` · the `sslmode` semantics change in pg-connection-string v3; Unix sockets arrive as a `host` query parameter; an `ssl` option overrides `sslmode` · rule requires the literal `verify-full`, reads the socket from the query and forbids the `ssl` override. **Fixed.**
- § 8 migration `[correctness]` · index and CHECK replacements incomplete · all listed. **Fixed.**

- PR #311 round (owner chose MCDA A 455/500: fix, no bot reply) `[security|correctness]` · retired keys must outlive pre-rotation backups (Archived state added); account export must decrypt `invitation.email_enc`. **Fixed.**

## 🔵 Nice to Have

- § 2 `event.*` `[docs]` · drafts are not public · reworded. **Fixed.**
- § 10 D6 C `[docs]` · justification unclear · reworded. **Fixed.**
- `docs/HANDOVER.md` `[docs]` · a few lines run past the wrap width · accepted, cosmetic.

## ⚪ Disagree / Intentional

_None._

## Per-dimension summary

- Design: proportional, flat module with an injected keyring. Docs: consistent after the fixes.
- Security: the crypto choices are sound; the rotation and TLS gaps are closed. Correctness: the inventory now matches the code.
