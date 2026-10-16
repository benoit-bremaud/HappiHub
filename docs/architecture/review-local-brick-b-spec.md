# Local review — HappiHub (brick B specification)

- Date: 2026-10-16
- Commit: 1722158
- Scope: branch diff `origin/main...HEAD` on `docs/brick-b-event-lifecycle-spec` (documentation only)
- Checks run: design · docs · tests (plan) · security · correctness, in one Opus review pass proportionate to a docs-only diff
- Verdict: Must 3 — all fixed in the follow-up commit (C1 decided by Benoît: B, 470/500) · Should 8 · Nice 6

Brick D's open items stay in [review-local.md](review-local.md); this file does not replace it.

## Pre-merge gate (head SHA 1722158)

| Step | Result |
|---|---|
| 1 Tests | ✅ server fast suite 48/48 (after `npm ci` in this worktree); integration suite not rerun — no runtime change |
| 2 Coverage | n/a for a docs-only diff (fast-suite line coverage 45.7 %, unchanged; brick D integration ~98 %) · doc counter: n/a |
| 3 SonarQube | ⚠️ not run — no source change to analyze |
| 4 Secrets | ✅ gitleaks clean (`origin/main..HEAD`, 2 commits) · no tracked `.env` · diff read: nothing sensitive |
| 5 QA pass | n/a — no runtime change (docs only) |

Gate: GREEN for a documentation push once the Must items are resolved.

## 🔴 Must Have

- `v1-brick-b-event-lifecycle.md` § 5 UC15 `[correctness]` · `Retry-After` used the UTC-day boundary while the quota is a sliding 24 h window · `Retry-After` = oldest `created_at` in window + 24 h − now; BC2 updated.
- `v1-brick-b-event-lifecycle.md` § 5 `[correctness][docs]` · error codes assumed an "existing error envelope", but the server answers `{message}` only · define `{message, code?, details?}`, additive for brick D routes, documented in the API contract.
- `v1-brick-b-event-lifecycle.md` § 6 / `v1-use-cases.md` UC8 / 05a `[design]` · deleting drafts at association closure is not in validated UC8 nor drawn in 05a · owner decision C1 (amend UC8 + 05a, or keep drafts until the 30-day cascade).

## 🟡 Should Have

- A1 sensitivity: A and C tie at 400; tie broken by criterion 1 (J3 D3).
- `created_at` is an addition to data study § 3; record it.
- `type` NOT NULL (required on creation).
- Publish/cancel with stale `baseVersion`, ended event, repeated transition: 409 codes defined; BC8/BC10/BC11 extended.
- Activity flooding by autosave: `EVENT_EDITED` coalesced per actor and event over 15 min.
- BC16 rejects with 400; a changed field without `base` when versions differ is a 400.
- `outbox_message.template` CHECK must be recreated by the brick B migration.
- Suspension check is a no-op hook until the moderation brick.

## 🔵 Nice to Have

- Expression index on the effective end instead of `(status, ends_at)`.
- Drop redundant "not edited since notice" condition.
- `POST …/delete` instead of `DELETE` with a body.
- Clearer `cancellation_reason` CHECK wording.
- Remove "ETag-free" leftover.
- Add IDOR (event of another association) and text-rule tests.

## ⚪ Disagree / Intentional

_None._

## Per-dimension summary

- Design: proportionate, one aggregate; UC8 scope drift. · Docs: error format and schema additions to state. · Tests: plan good, add IDOR case. · Security: authz and projection sound; IDOR test missing. · Correctness: Retry-After, stale-version paths; MCDA totals verified, one tie.
