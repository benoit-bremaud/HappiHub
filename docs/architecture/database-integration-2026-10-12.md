# Database integration and API contract verification — 2026-10-12

Owner approved isolated MongoDB tests and documentation. Database choice remains provisional for later conception review. Implementation is local on fix/security-boundaries.

## Evidence

- Ten integration scenarios pass against real MongoDB 7.0.40 using the already-installed mongodb-memory-server 10.0.0.
- The binary was downloaded with checksum verification. Process binds 127.0.0.1 with an allocated port, uses synthetic fixtures, and only connects through its own generated URI.
- Indexes initialized before tests. Only this suite's synthetic collections are reset. Connection is closed and process stopped after execution.
- Cases: signup hashing/default role/password projection, invalid login, profile edits and rehashing, signup role rejection and unique-email index, event ownership/pending visibility, actual Mongo visibility filters, private-comment reads and authorship, forged identity rejection, concurrent idempotent participation, deleted-account token rejection.
- Initial run failed because synthetic .test email domains did not pass the existing Joi email rule. Corrected to example.com fixtures; no runtime validation relaxed.
- Fast tests remain separate: 64 pass across six suites. Integration command: npm run test:integration. Fast command: npm test -- --runInBand.
- No database-driven production defect established by these scenarios. No transactions or replica-set behavior tested. No deployment, browser E2E, recovery, rate limiting or load validation.

## Documentation

Replaced stale API documentation with the verified route inventory, payload limits, response projections, owner/public visibility, errors and absent features. Clarifies no server logout/revocation, no moderation approval or event edit endpoint, unpaginated lists, global title uniqueness, image-screening limitations and legacy fields accepted but not persisted. Added concise contracts to public controller functions and event projection.

## Remaining audit findings

Sessions/revocation, rate limits, headers, dependency advisories, container configuration and credential classification remain unresolved. Database/model choice will be reassessed in the UML/conception study. This suite does not establish production readiness. Changes have not been committed, pushed or submitted as a PR.
