# Local review — HappiHub (#244 partner API conception)

- Date: 2026-10-24
- Commit: 4b99425 (head of `docs/244-partner-api-study`)
- Scope: branch diff `origin/main...docs/244-partner-api-study` (docs only: spec, 4 diagrams,
  log, handover, V1 framing and use-case pointers)
- Checks run: design · docs · security · correctness (one combined Opus conception review,
  proportional to a docs-only diff); tests not applicable
- Verdict: ship  ·  Must 4 ✅ · Should 7 ✅ · Nice 4 ✅ · Disagree 2 (all corrections validated by Benoît
  through MCDA questions and applied; spec § 11 records the scores)

## Pre-merge gate (head SHA 4b99425)

| Step | Result |
|---|---|
| 1 Tests | n/a — no code changed |
| 2 Coverage | n/a — no code changed |
| 3 SonarQube | n/a — no analysable source changed |
| 4 Secrets | ✅ gitleaks clean (`origin/main..HEAD`, 3 commits) · no tracked .env · diff read: nothing sensitive |
| 5 QA pass | n/a — no runtime change |

- Gate: **GREEN — docs-only change, every finding resolved**; the four Mermaid diagrams render
  with `@mermaid-js/mermaid-cli` 11.4.2.

## 🔴 Must Have (all ✅ fixed: M1 a1, M2 a2, M3 a2 `DRAFT_PUBLISHED`, M4 a)

- `specs/partner-api.md:79,118-121`, `diagrams/partner-api/02-sequence-create-draft.md:31-46` `[security|correctness]` · Two-transaction idempotency: a crash after commit leaves the row "in progress" for 24 h, so the partner retries with a new key and creates a duplicate; stored 4xx replayed 24 h · Write the idempotency row inside the event transaction, store only 201; drop the in-progress state and `409 IDEMPOTENCY_IN_PROGRESS`.
- `diagrams/partner-api/02-sequence-create-draft.md:24-63` `[correctness]` · `alt` blocks without success branch; missing 400 `IDEMPOTENCY_KEY_REQUIRED`, 403 `ASSOCIATION_UNAVAILABLE`, 429, 400 field errors; PATCH without limits · Use `break` per early exit and add the missing branches.
- `specs/partner-api.md:80-81,196` `[correctness]` · `409 EVENT_READ_ONLY` for a published own draft is unreachable (query filters DRAFT) and changes brick B's meaning · 404 for anything not an own draft.
- `specs/partner-api.md:114-116` `[security]` · `EDIT_CONFLICT` sends a member display name to partners (contradicts T5/R4) · `lastEditedBy: {kind: MEMBER}` or `{kind: KEY, name}`.

## 🟡 Should Have (all ✅ fixed as proposed)

- `specs/partner-api.md:62-64`, `server/services/events.js:17` `[design]` · Key edits would show as "former member"; both attribution columns could be set · CHECK at most one, member writes clear the key column, A-B6 amended.
- `specs/partner-api.md:80`, `server/domain/event.js:151` `[correctness]` · Retried PATCH yields a false `EDIT_CONFLICT` · Treat "already equal to requested value" as applied (brick B amendment).
- `specs/partner-api.md:58-66` `[design]` · Rotation or scope change orphans in-progress drafts · Record as D4 trade-off; partner guide note.
- `specs/partner-api.md:60` `[security]` · A write key outlives its creator's membership · R8 revoke on creator leave/removal/deletion.
- `specs/partner-api.md:61` `[security]` · One key can exhaust the association quota and block members · Per-key cap 10 / 24 h.
- `diagrams/partner-api/01-use-case.md:21,29-32` `[design]` · "Authenticate key" as included use case is functional decomposition · Remove; preconditions only.
- `specs/partner-api.md:99-104` `[design]` · Create under `/events`, read/edit under `/drafts`; mixed path styles · `POST /v1/drafts`; consistent `/api/v1/...` and `:id`.

## 🔵 Nice to Have (all ✅ fixed)

- `specs/partner-api.md:125`, `04-class.md:24-28` `[design]` · `scopes text[]` + enum for one bit · `can_write boolean`, exposed as `scopes`.
- `diagrams/partner-api/04-class.md:40` `[design]` · `0..5` wrong once revoked keys are kept · `0..*` with constraint.
- `specs/partner-api.md:76,82,87,112` `[docs]` · AC1 untestable timing wording; AC7 omits moderation hiding; `ASSOCIATION_UNAVAILABLE` vs `ASSOCIATION_CLOSED`; 413/415 missing.
- `specs/v1-use-cases.md:190,605`, `specs/partner-api.md:4,224` `[docs]` · Stale "read-only" wording, quota table, duplicated clause, dangling sentence.

## ⚪ Disagree / Intentional

- OpenAPI conformance test (AC11) and `/v2` sunset policy · justified by the owner's "API quality and documentation first" rule.
- Brick B events service reused with a member-or-key actor · single source of truth, not over-engineering.

## Per-dimension summary

- Design: sound reuse of brick B; two over-built parts (idempotency state, scope array). Docs: diagrams contradict spec in places. Tests: n/a. Security: one member-data leak, two key-lifecycle gaps. Correctness: idempotency crash path, unreachable error code.
