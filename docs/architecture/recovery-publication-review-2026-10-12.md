# Recovery publication review — 2026-10-12

Scope: complete fix/security-boundaries diff against origin/main e3e9007 plus the
roadmap/contributor/continuity documentation update. This is a structured local
self-review; CodeRabbit CLI is absent and no independent tool review ran.
Owner authorized commit, push and PR with Clement review. No merge or deployment.

## Review coverage

- Server composition/configuration, session store/deadlines, auth/CSRF, controller
  identity/visibility/projections, route order, runtime validation and password hashing.
- Client provider/API adapter, startup, login/logout/profile, events/comments/register,
  errors, cancellation, legacy bearer removal and consumers of projected responses.
- Manifests and lockfile root declarations, changed dependency inventory and audit results.
- Docker stages, build-context exclusions, private mounted configuration, network/volume
  isolation, explicit proxy addresses, ingress contract and non-root processes.
- Fast/security/session tests, isolated real-Mongo constraints/concurrency/password
  revocation tests, provider/API/component tests and their scoped limitations.
- Accepted cookie-session conception/diagrams, API/configuration/Docker documents,
  dated remediation evidence, roadmap, contributor guide and portable continuity files.
- Every previously open issue disposition against the current source and new work plan.
  Superseded routes/classes and broad test coverage are not presented as completed.

## Findings and explicit dispositions

| Classification | Evidence | Disposition |
| --- | --- | --- |
| Must Have, resolved | docs/API_DOCUMENTATION.md profile contract said database conflicts always return 500; server/controllers/userController.js:71 returns 409 for a concurrent verified-hash mismatch | Corrected API prose to distinguish email/index failures from password concurrency conflicts; verified against handler |
| Must Have, resolved | docs/CONTRIBUTING.md:1 retained stale root npm, environment and JWT onboarding directions | Added root CONTRIBUTING.md as the current authority with verified package commands/configuration links and marked old guide historical |
| Should Have | client/src/session.js:12 and component mutation errors do not automatically synchronize an expired session or offer dedicated form-level refresh | Deferred to UX #249 and editor conception #245; server still rejects unauthorized writes and no mutation is automatically replayed |
| Should Have | server/validation/eventValidation.js:10 performs signature/size checks, not complete image decoding or dimension policy | Deferred to media conception #62; limitation stated in API documentation |
| Should Have | server/controllers/userController.js:12 signup has no dedicated rate limiter; existing limits cover bootstrap/login | Remaining abuse/quotas study in #55 and external API conception #244; no blanket claim of complete hardening |
| Should Have | client/package.json:9 and server dev toolchain retain dependency advisories; build has Card alt-text/Home unused-variable/CRA warnings | Deferred to approved-study-required tooling #248 and accessibility #56; runtime server audit is zero, client tree 104 affected entries |
| Should Have | server/tests/sessionFixture.js:2 consumes transitive cookie-signature; legacy JS/TS tooling lacks a dedicated typecheck | Evaluate direct test declarations and typing/toolchain contract in #248; current lockfile installation and suites pass |
| Should Have | Docker baseline lacks verified image vulnerability/backup/restore/resource-policy acceptance for real deployment | Tracked by #21/#55/#25; synthetic local/HTTPS checks are not launch approval |
| Nice to Have | server/routes/commentRoutes.js:17 legacy commented route templates and server/validation/eventValidation.js:2 unused import/doc noise | Defer proportional cleanup to #57/#41; these templates are not advertised implemented endpoints |
| Disagree | Require generic repository/service layers around every existing thin CRUD handler | No present force justifies pass-through layers; pure policy and query adapters plus real boundary tests remain appropriate at this scale |

Earlier Must Haves in dated reports (credential tracking, unsafe container assumptions,
consumer contract regressions, session touch/logout race and persistence failure cookies)
were rechecked against the later remediation and current source/test evidence. No unresolved
Must Have was identified in this publication review. This is not an exhaustive security certification.

## Fresh verification before publication

- 86 fast server tests (7 suites), 14 isolated MongoDB integration tests (1 suite),
  18 client tests (3 suites): passed; client production build passed with documented warnings.
- Server npm audit --omit=dev: zero known vulnerabilities. Client npm audit: 104 affected
  dependency entries (3 low, 37 moderate, 64 high, zero critical); not independent exploit counts.
- Manifest declarations match lockfile root dependency/devDependency declarations.
- Gitleaks 8.30.1: zero matches for new commits origin/main..HEAD and current tracked-source
  snapshot. Earlier repository history is not erased/rotated; the prior full-history report
  remains relevant. Private configuration and raw inventories are excluded from publication.
- No dedicated lint/typecheck scripts or repository CI workflows exist; these checks cannot
  be reported green. Client build includes its configured lint. No workflow changes made.
- Whitespace and 78 current local documentation links checked before the push. Legacy
  placeholder links in historical guides are not claimed repaired.

Earlier container builds, browser workflows, rendered UML and actual API restart persistence
checks are recorded in session-migration-2026-10-12.md; they were not repeated for this docs-only step.
The implementation gate remains in force for all future product/demo/tooling code.
