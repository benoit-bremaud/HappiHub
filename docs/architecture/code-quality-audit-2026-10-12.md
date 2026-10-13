# HappiHub architecture and code-quality audit — 2026-10-12

Scope: current local fix/security-boundaries, including uncommitted security changes and existing client/server code. Read-only audit. No claim of repository-wide compliance or production readiness. Applied architecture, design-patterns, testing-strategy, documentation-coverage and security policy. No external reviewer available; CodeRabbit CLI absent. No subagents used.

## Verdict

Partially compliant. Pure access rules and separate application/startup improve dependency direction and testability. Thin controllers may legitimately import persistence at this scale; that alone is not a Clean violation. No evidence justifies full entities/use-cases/repositories layers. UI responsibility mixing, duplicated rules, drifting contracts and missing behavior coverage are current pressures that justify small seams. Liskov and interface segregation have little concrete applicability without subtype hierarchies or large interfaces; do not manufacture compliance claims or patterns.

## Prioritized findings

| ID | Priority | Evidence | Finding and correction |
| --- | --- | --- | --- |
| Q1 | P1 Must Have | client/src/components/Comment/Comment.jsx:87; server/controllers/commentController.js:27 | API projection omits user_id but UI dereferences user_id.name. New projection introduced this contract regression. Preserve privacy: render the current projection and use a safe fallback, rather than restoring full user data. Add component coverage. |
| Q2 | P1 Must Have | client/src/components/Comment/Comment.jsx:45,65,82 | Request-body data shadows comment-list state, then spreads an object as an array. Submit also triggers reload immediately. Rename payload, use functional list update, remove premature reload and test async submission. Predates security patch. |
| Q3 | P1 Must Have | client/src/components/Profil/Profil.jsx:64; server/validation/userValidation.js:54 | Empty password is always sent for ordinary name/email edits and rejected by new validation. Reproduced validator behavior. Omit unchanged password client-side and test actual consumer payload. |
| Q4 | P1 Must Have | client/src/components/Event/EventInfo.jsx:18; client/src/components/Comment/Comment.jsx:30 | Anonymous UI sends Bearer null; optional authentication rejects it. Comment component redirects anonymous visitors. API public behavior cannot be consumed. Use conditional headers and separate comment viewing from authenticated posting. |
| Q5 | P2 Should Have | client/src/components/Event/EventCreate.jsx:57,59; comment submission:66,68 | Removing logs left empty failure branches/catches. New patch worsens silent-failure behavior. Introduce actionable generic errors and retain entered content. Backend generic errors also need privacy-safe operational diagnostics in later hardening. |
| Q6 | P2 Should Have | client/src/components/Event/Event.jsx:19,45; EventInfo.jsx:35 | Navigation during render, stale effects and no request cancellation/loading/error states. Move side effects into hooks and stabilize dependencies without render loops. |
| Q7 | P2 Should Have | server/controllers/commentController.js:9; server/validation/commentValidation.ts:10 | Runtime inline comment schema differs from the validator tested by old suites. Tested validator requires author ID and lacks runtime limits. Establish one runtime validation source; update tests accordingly. |
| Q8 | P2 Should Have | server/utils/access.js:2; server/controllers/eventController.js:20,29,51 | Visibility logic duplicated between pure predicate and Mongo filters. Centralize domain facts, keep Mongo query construction in adapter boundary, test equivalent truth tables and query behavior. Do not make pure rules import Mongoose. |
| Q9 | P2 Should Have | client event/profile/comment components | UI mixes presentation, IO and session handling. Repeated hardcoded API origins justify one small API module, then focused hooks only where complexity requires them. No generic service framework. |
| Q10 | P2 Should Have | server/app.js:17; server/middleware/auth.js:8; server/utils/jwt.js | Global environment reads at import/request time and repeated tier selection reduce isolation. Inject validated config at app construction, with minimal scope. Consolidate password byte validation repeated three times. |
| Q11 | P2 Should Have | server/tests/security.test.js:15,18 | Env changes are not restored and time-dependent tokens are uncontrolled. Persistence stubs do not verify Mongoose hashing hooks, selectors, query filters or atomic operations. Restore environment, control clock and add isolated real database integration tests. |
| Q12 | P2 Should Have | server/controllers/*.js; docs/API_DOCUMENTATION.md | Most public controller exports lack contract documentation; API documentation contains outdated contracts. Document privacy/error/identity semantics and update examples. Existing commented-out route templates and enormous unused Jest config add doc noise. |
| Q13 | P2 Should Have | client/src/components/Register/Register.jsx:91; remaining export defaults | Named-export and design-token rules are not universally met; JS/TS mixing lacks a strict typecheck contract. Address touched surfaces first, propose typing migration separately. No project-wide rewrite justified. |
| Q14 | P2 Should Have | server/validation/eventValidation.js:11 | Image magic bytes do not establish valid dimensions or decodable safe content; HTTPS links allow arbitrary remote hosts. Keep limitation explicit and define image decoding/storage/remote-image policy separately. No server SSRF is demonstrated because URLs are not fetched server-side. |

## Documentation measurement

Sample: server/controllers, server/utils and server/middleware exported const declarations only. 4/20 have a preceding JSDoc block by a lightweight lexical check. This is a scoped presence estimate, not semantic doc quality or repository coverage. Several present blocks lack params/return/error contracts.

## Good decisions retained

- Small pure access policy, no speculative ports or pass-through layers.
- Express construction separated from database/startup.
- Database IO is the doubled boundary in HTTP tests, with actual middleware and rules exercised.
- Response projections and authenticated authorship reduce data exposure.
- Atomic participation addToSet avoids list duplication and broken user-side writes.

## Proposed remediation sequence

1. Correct Q1–Q6 consumer regressions and observable failure behavior in the existing security branch. Files: Comment, Profil, Event, EventInfo, EventCreate, small API helper and focused client tests. Preserve server privacy boundaries. No product/editor features.
2. Consolidate Q7–Q10 validation and policy/config responsibilities with proportional functions. Do not introduce a repository hierarchy. Capture precise contract decisions first.
3. Address Q11–Q12 with real database boundary integration, test isolation and accurate documentation. Database fixtures remain synthetic and separate from user data.
4. Handle Q13–Q14 and broader sessions/dependencies/containers/CI as separately approved work. Existing security residual risks remain open.

No new code changes made during this audit. Prior tests pass but do not establish client/server contract correctness. Prior final security status overstated readiness: the consumer regressions must be repaired before committing/pushing/opening a PR.
