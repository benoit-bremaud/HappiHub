# Client contract repairs — 2026-10-12

Owner approved package 1 only. Implemented locally on fix/security-boundaries. Backend privacy and authorization unchanged in this increment.

## Corrected

- Comments consume the projected content without dereferencing omitted author fields. Neutral attribution pending product framing.
- Post payload and list state separated; functional append; no immediate reload. No client author identity submitted.
- Public listing/detail/comment reads omit missing or expired credentials. Anonymous visitors can read but must sign in to post.
- Profile updates omit unchanged password. Save success/failure is visible and failures retain edits.
- Event creation failures show generic feedback and retain input. Submission disabled while saving.
- Event/comment load effects have stable primitive dependencies, abort on unmount, reset stale data and expose loading/errors. Navigation removed from event-list render.

## Verification

13 client tests pass, including the prior two session tests. New component tests use real components and mock only fetch. Cases cover projected responses, successful comment append, failed saves, anonymous/expired-token requests, profile payloads, event errors and request abortion.

50 server tests still pass. Client build passes with seven remaining lint warnings in Card, Home, Logout and Register, plus existing CRA tooling warnings. Full browser/server/database E2E not performed. Diff whitespace check passes.

## Next work

Validation/policy/API configuration consolidation remains a separate plan. UML conception review is explicitly requested for later: inventory existing diagrams, review against collaboratively agreed product requirements, and create or replace only justified views. Do not treat legacy implementation as the authoritative future specification.

No commit, push, PR, CI modification or GitHub issue update in this increment.
