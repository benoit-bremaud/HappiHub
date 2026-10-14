# Credential cleanup — 2026-10-12

Approved by owner. Local server environment files removed from Git tracking, ignored and retained with owner-only permissions. Client local API-only configuration created because it was absent. No deployment credentials rotated or historical commits rewritten.

## Changes

- Ignore all .env.* except .env.example, including server overrides.
- Server template contains public defaults and instructions for private signing configuration, no signing values.
- Compose embeds no database credentials; requires privately supplied variables and fails closed when absent. All profiles require these variables at parsing time.
- REST example uses a private accessToken variable and synthetic example identities/password placeholders.
- Historical JWT guide uses environment references rather than signing/token literals, with an explicit historical-guide notice.
- README links to accurate private configuration instructions. New CONFIGURATION.md distinguishes local setup, rotation and remaining container problems.

## Validation

Current tracked-source snapshot plus configuration guide: zero Gitleaks matches. Full local Git history: 11 matches remain in historical documentation and REST examples. They are not erased by current-tree cleanup. Earlier zero history scan was incomplete evidence; current result supersedes it.

Compose config passes with synthetic variables; reports only existing obsolete-version warning. Fast server suite: 64 tests pass. Diff whitespace check passes. Existing environment files confirmed ignored and preserved.

## Boundaries

No verified live deployment target. Former tracked signing values must not be reused with real accounts. If used by a live service, coordinate replacement and session invalidation. Updating Compose initialization variables does not rotate users in existing database volumes. Shared storage, exposed ports, images, session revocation and dependencies remain separate work. No push or PR in this cleanup.
