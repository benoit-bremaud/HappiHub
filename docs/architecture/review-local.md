# Local review — HappiHub (docs/v1-traceability)

- Date: 2026-10-15
- Commit: e641b4d + staged changes
- Scope: branch diff main...docs/v1-traceability (documentation and UML only)
- Checks run: design · docs · security (tests and correctness: not applicable, no code)
- Verdict: ship after fixes · Must 2 (resolved) · Should 6 (applied) · Nice 3 (applied)

## 🔴 Must Have
- `docs/architecture/specs/v1-use-cases.md` UC31 `[security]` · a suspended account could not
  sign in, so it lost GDPR export and erasure for the whole suspension · resolved by owner
  MCDA (B 410/500): restricted sign-in to "My account" (UC5, UC6, UC9).
- `docs/architecture/specs/v1-use-cases.md` § Quotas `[security]` · per-account failure limit
  enabled targeted lockout · resolved by owner MCDA (A 465/500): per (account, IP) plus per IP,
  neutral 429.

## 🟡 Should Have
- `v1-use-cases.md` § Quotas `[docs]` · sign-in limit wrongly attributed to ADR-0001 · source
  reworded (new in T2).
- `v1-traceability.md` §1–3 `[docs]` · gap markers read as open · legend states they are
  resolved in section 5.
- `04-class.md` T1 `[design]` · `decidedBy` absence ambiguous; role kinds' target untyped ·
  note added.
- `06-data-flow.md` sessions row `[security]` · membership re-check invariant made explicit.
- `v1-use-cases.md` public browsing `[security]` · public event ids opaque, non-sequential.
- `HANDOVER.md` `[docs]` · T10–T11 are open, not resolved · reworded.

## 🔵 Nice to Have
- `v1-traceability.md:7` `[docs]` · baseline wording includes this branch's edits.
- `v1-use-cases.md` UC28 2b `[docs]` · per-IP then per-key limit stated.
- `v1-use-cases.md` § Quotas `[design]` · counters process-local (single instance).

## ⚪ Disagree / Intentional
- `v1-traceability.md` section 5 `[design]` · 05c account state diagram deferred · T4 MCDA.

## Per-dimension summary
- Design: no over-engineering; DecisionKind extension acceptable · Docs: stale markers fixed ·
  Tests: n/a · Security: two Must resolved by owner decision · Correctness: n/a
