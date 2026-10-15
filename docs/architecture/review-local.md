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

## Per-dimension summary
- Design: schema retention/cascade and index gaps fixed · Docs: links and 04 coverage verified · Tests: n/a · Security: outbox secret fixed · Correctness: all MCDA totals verified.
