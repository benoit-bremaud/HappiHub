# Local review — HappiHub (#310 database encryption at rest)

- Date: 2026-10-23
- Commit: 123e895
- Scope: branch diff `main...feat/310-db-encryption`
- Checks run: design · docs · tests · security · correctness
- Verdict: fix Must Have first  ·  Must 4 · Should 9 · Nice 7

## Pre-merge gate (head SHA 123e895)
| Step | Result |
|---|---|
| 1 Tests | ✅ server unit 139 · ✅ server integration 107 · ✅ client 84 |
| 2 Coverage | server integration 90.74 % stmts / 72.76 % branches / 96.51 % funcs / 93.49 % lines (floor 80) · client 92.61 % stmts · docs not measured (no counter in the project) |
| 3 SonarQube | ❌ FAILED (new_violations = 5) · hotspots ⚠️ not read (the analysis token lacks the right to browse them) |
| 4 Secrets | ✅ gitleaks clean (`main..HEAD`, `--all`, dir scan) · no tracked .env · diff read: nothing sensitive (dev keyring is ignored) |
| 5 QA pass | ⏳ not run yet (runs after the Must fixes) |
- Gate: **RED — step 3 (SonarQube) and step 5 (QA pending)**

## 🔴 Must Have
- `server/config/databaseUrl.js:15,18` `[security|design]` · A repeated `host` or `sslmode` parameter bypasses D7. `URLSearchParams.get()` reads the first value, while `pg-connection-string` uses the last. So `?sslmode=verify-full&sslmode=disable` is accepted in production and the driver connects without TLS. · Refuse `getAll(key).length > 1` for `host` and `sslmode`, and add unit tests with both URLs.
- `docs/API_DOCUMENTATION.md` `[docs]` · States that `npm run migrate` needs the keyring; `migrate.js` never reads it. · Remove the claim.
- `docs/architecture/specs/db-encryption-at-rest.md` § 8 `[docs]` · The heading still says "not authorized yet", and the line anchors are stale. · Update the heading and anchors.
- SonarQube new violations `[correctness]`:
  - `server/domain/fieldCipher.js:23`: S6582 (use an optional chain).
  - `server/jobs/reencrypt.js:37,59,60` and `server/services/outbox.js:35`: S9382 (await in a loop). The sequential order is intentional (batched row locks, ordered delivery), and #252 set a precedent of accepting S9382.
  - Fix S6582 in code; S9382 needs an owner decision: accept it as intentional, or refactor.

## 🟡 Should Have
- `server/domain/fieldCipher.js` + services/jobs `[design]` · The AAD column names are repeated as raw strings, and a typo still passes the regex. · Use exported `FIELD` constants with a membership check.
- `server/services/invitations.js:131` `[design|tests]` · There is no test that stored addresses are folded (spec § 5), and the comment credits `foldEmail` with work `emailSchema` does. · Add an integration test and correct the comment.
- `server/domain/fieldCipher.js:68` `[design|correctness]` · `String(value)` silently stores `[object Object]`. · Reject non-string values with FieldCipherError.
- `server/services/outbox.js:26` `[design|docs]` · A missing cipher turns into delivery failures, and after the retries the payloads are set to NULL. · Add a guard, `if (!cipher) throw`.
- `server/scripts/generate-keyring.js` `[design|docs]` · The script is missing from the spec § 8 impact table. · Add the row and record the owner's acknowledgement.
- `server/jobs/reencrypt.js:28` `[correctness]` · One malformed envelope aborts the whole run. · Document this as fail-closed, or report the failing row id.
- Migration up `[docs]` · The migration requires empty tables and gives no explicit message. · Add a note in CONFIGURATION/HANDOVER.
- `server/tests/integration/encryption.test.js` `[tests]` · Gaps: the blind index after rotation, paging past one batch, `remaining > 0`, and a fail-closed check at API level. · Add those cases.
- `server/tests/unit/fieldCipher.test.js:127` `[tests]` · The negative-lookahead regex is a weak assertion. · Assert the exact message and check that `secret-value` is absent.

## 🔵 Nice to Have
- `server/jobs/reencrypt.js:6` `[docs]` · "AC15" refers to brick D's spec. · Change it to "brick D AC15".
- `docker-compose.yml:42` `[correctness]` · The short bind syntax creates a directory when the keyring file is missing. · Use the long syntax with `create_host_path: false`.
- `docs/DOCKER.md` `[docs]` · The "least-privilege role" sentence is now misplaced. · Move it.
- `server/services/events.js` `[design]` · The public page decrypts an editor name it never shows. · Add a comment.
- Cipher argument style `[design]` · The `(db, cipher)` and `(client, ctx)` styles are mixed. · Align them when these functions are next touched.
- `server/tests/unit/fieldCipher.test.js` `[tests]` · The config tests would be easier to find in `config.test.js`.
- Keyring readability for uid 1000 in the container `[docs]` · Add a note in DOCKER.md.

## ⚪ Disagree / Intentional
- Using `node:crypto` in `domain/` keeps it pure: there is no file, environment or database access (spec § 8, § 16).
- Keyring validation lives in the cipher, and the loader only reads (§ 16).
- The literal SQL per table in `reencrypt.js` follows brick D AC15 (constant query text).
- The down migration uses `TRUNCATE … CASCADE` (§ 8: restore the clear shapes empty).
- `migrate.js` calls `databasePoolConfig` only for its check, which keeps one helper for every entry point (§ 7).
- Unix socket in Compose prod: the owner validated option A (425/500).

## Per-dimension summary
- Design: no over-engineering. One check fails open, plus magic strings.
- Docs: two inaccurate statements and one stale spec heading.
- Tests: the suites are green, with rotation and folding gaps.
- Security: one fail-open D7 bypass. Everything else fails closed.
- Correctness: there are 5 Sonar violations, and reencrypt is brittle on a malformed envelope.
