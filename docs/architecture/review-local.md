# Local review — HappiHub (branch docs/brick-d-accounts-associations vs main)

- Date: 2026-10-16
- Commit: c2b5be5 + review fixes
- Scope: brick D spec, 06-data-flow (md/puml/svg), UC1 and J1 D1 amendments, PROJECT_LOG.md,
  docs/HANDOVER.md (documentation only)
- Checks run: design · docs · security · correctness (MCDA arithmetic, consistency with
  UC1–UC12, schema study, 02b, 04, ADR-0001/0003); test-quality pass not applicable to a docs-only diff
- Verdict: ship after fixes · Must 2 (fixed with owner decisions) · Should 9 (fixed) · Nice 5 (3 fixed, 2 disagree)

## 🔴 Must Have
- `specs/v1-brick-d-accounts-associations.md` §4/§9 S2 `[correctness|design]` · "ACTIVE only" contradicted UC1 1b, quotas and 04 `0..5`, and allowed create-then-close bypass · Fixed: owner revised S2 to "5 in total" (440 vs 240), enforced by `account.associations_created`.
- `specs/v1-brick-d-accounts-associations.md` §5 UC1 `[security]` · sign-in on sign-up revealed existing emails (cookie, timing) · Fixed: owner decision N1 "verify first" (335 vs 330); same 202 without cookie, dummy bcrypt, link signs in; UC1 and J1 D1 amended; AC2 strengthened.

## 🟡 Should Have
- §2 sensitivity `[correctness]` · TypeScript-flip claim false · Fixed.
- §1 scope `[design]` · maintenance job tasks F19–F25 missing; accept ignored `expires_at` · Fixed: scope row, §4 expiry rule, AC19.
- §1/§5 `[docs]` · dead UC13 dispute link, template name mismatch · Fixed: UC13 out of scope, `MEMBER_REMOVED` without link.
- §6 log transport `[correctness]` · marked rows sent instead of deleting (DF1) · Fixed.
- §5 tokens `[security]` · invitation token in URL path reached access logs; `target_ref` content unspecified · Fixed: token in fragment and request bodies, AC18, `target_ref` never an email.
- §1 `[docs]` · client and API contract scope missing · Fixed.
- §8 `[docs]` · stale S3 sentence · Fixed.
- §7 `[tests]` · ACs missing UC11 2a, rate limits, token lifetimes · Fixed: AC12, AC17, token lifetimes in §5.
- `06-data-flow.md` `[security]` · "pseudonymous, no other data" overstated · Fixed: personal data, free text stays until DF5.

## 🔵 Nice to Have
- §3 session store `[design]` · absolute cap and per-account revocation · Fixed: stated in code via `auth_version`.
- §10 02b paths `[docs]` · Fixed: §5 supersedes 02b paths.
- Title vs scope `[docs]` · Fixed: UC1–UC8, UC10–UC12.

## ⚪ Disagree / Intentional
- `docs/HANDOVER.md` long line `[docs]` · consistent with the existing list style.
- `docs/WORK_PLAN.md` not updated `[docs]` · HANDOVER and PROJECT_LOG carry brick status; WORK_PLAN holds direction only.

## Pre-merge gate (local, 2026-10-16)

| Step | Result |
| --- | --- |
| 1 Tests | Server 93/93 unit; diff touches no code |
| 2 Coverage | Unchanged from `main` (server 83.2 %; client 58.5 % pre-existing, #272); docs diff only |
| 3 SonarQube | Not run: pre-existing unavailability, #274 |
| 4 Secrets | gitleaks `origin/main..HEAD` clean; no tracked `.env`; manual diff read clean |
| 5 QA | Not applicable to the product: diff is documentation; 06 SVG re-rendered with PlantUML and checked |

Gate: docs-only diff is safe; red items are the pre-existing ones under the owner's waiver of
2026-10-16 (#272–#274).

## Per-dimension summary
- Design: scope gaps (jobs, UC13, client) closed · Docs: links resolve, statuses current · Tests: AC set completed · Security: enumeration and token logging fixed · Correctness: all MCDA totals verified.
