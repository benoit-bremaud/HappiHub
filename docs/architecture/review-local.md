# Local review — HappiHub (branch docs/246-data-migration-study vs main)

- Date: 2026-10-16
- Commit: 5d1d252 + review fixes
- Scope: v1-data-migration.md, ADR-0003, PROJECT_LOG.md, docs/HANDOVER.md (documentation only)
- Checks run: design · docs · correctness (MCDA arithmetic, links, facts vs models); tests and security code passes not applicable to a docs-only diff (GDPR/secret concerns reviewed under design)
- Verdict: ship after fixes · Must 3 (fixed) · Should 6 (fixed) · Nice 2 (1 fixed, 1 disagree)

## 🔴 Must Have
- `v1-data-migration.md` §3 `removal_dispute`, `moderation_dispute` `[design|docs]` · CASCADE on account/association deletion wiped disputes kept 12 months (F19b, DF5) · Fixed: FK `SET NULL`, stored `association_name`, retention paragraph.
- `v1-data-migration.md` §3 `[design]` · purges in 06 had no supporting indexes · Fixed: indexes on expiry/failure/decision dates and unverified accounts.
- `v1-data-migration.md` §3 moderation tables `[design]` · polymorphic target unconstrained, no lookup index, retained pseudonymous id unlisted · Fixed: CHECK, (`target_kind`, `target_id`) index, 06 follow-up noted.

## 🟡 Should Have
- §3 `event`, `association` `[docs|design]` · image FKs missing from owner rows · Fixed, with `SET NULL` and F21 deletion order.
- §3 `session` `[docs]` · revocation path unstated · Fixed: `auth_version` (ADR-0001).
- §3 account deletion `[docs|design]` · cascade claim hid non-FK deletes and the last-member rule · Fixed: explicit transaction per UC6 2a.
- §3 `outbox_message` `[design]` · token link at rest for 30 days on failure · Fixed: payload cleared on final failure.
- §3 `event` price CHECK `[design]` · one-directional · Fixed: equivalence CHECK.
- §2 sensitivity `[correctness]` · omitted D (370) and unsupported 3:1 claim · Fixed.

## 🔵 Nice to Have
- §4 sensitivity wording `[docs]` · Fixed: B dominates every criterion.

## ⚪ Disagree / Intentional
- §3 `invitation.status` `[design]` · redundant since DF4 deletes non-pending rows · Kept for fidelity to the validated 04 `InvitationStatus`; simplification belongs in brick D.

## Pre-merge gate (local, head `e2c1f98`, 2026-10-16)

| Step | Result |
| --- | --- |
| 1 Tests | Server 93/93 unit, 14/14 real-Mongo integration; client 18/18; client build OK |
| 2 Coverage | Server 83.2 % statements (≥ 80); **client 58.5 % (< 80 floor), pre-existing, no Jest threshold configured**; doc coverage not measured (no JSDoc tooling); this diff touches no code |
| 3 SonarQube | **Not run**: the SonarQube server is unreachable from this session |
| 4 Secrets | gitleaks: branch range and full history clean; only `.env.example` files tracked; manual diff read clean |
| 5 QA smoke | Docker local stack healthy; `/events` renders, `GET /api/users/session` and `/api/events/public` 200 ([screenshot](qa/2026-10-16-246-smoke-events.jpg)). Pre-existing console error: Bootstrap JS loaded from CDN without jQuery (`client/public/index.html:43`); video range requests aborted by design |

Gate verdict: docs-only diff is safe; the red items (client coverage, Bootstrap/jQuery error,
SonarQube unavailable) predate this branch and need owner decision before merge.

## Per-dimension summary
- Design: schema retention/cascade and index gaps fixed · Docs: links and 04 coverage verified · Tests: n/a · Security: outbox secret fixed · Correctness: all MCDA totals verified.
