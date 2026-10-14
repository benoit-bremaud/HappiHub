# Focused consolidation — 2026-10-12

Owner approved the validation, event-policy, client API and server configuration consolidation. Work remains local on fix/security-boundaries in /home/vev/Documents/02_personal/HappiHub. The newer /home/vev/ChatGPT/happihub folder contains no project files.

## Responsibilities

- server/validation/commentValidation.js is the one runtime comment schema used by controller and tests. Existing TS path is a compatibility re-export with types, not a duplicate schema.
- server/validation/password.js owns bcrypt UTF-8 byte limits reused by all user input schemas.
- Pure access policy owns public status facts. server/queries/eventAccess.js translates visibility into Mongo query syntax. Domain code does not import query adapters.
- client/src/api.js owns API URL and conditional bearer handling, preserves AbortSignal, and does not mutate supplied headers. It uses REACT_APP_API_URL or the existing local default.
- readAppConfig resolves current configuration keys once. createApp constructs isolated instances without reading process.env. Authentication and token signing consume app configuration.

Startup now rejects missing signing key, invalid expiration, invalid origin or port with generic configuration errors. Existing JWT_EXPIRATION values must use an explicit supported unit (for example 5m). Database connection configuration still uses the existing Mongo setup; no infrastructure/environment-file migration was performed.

## Verification

64 server tests pass across six suites; 16 client tests pass across three suites. Domain visibility is compared with adapter query behavior for all modeled status/privacy/ownership combinations. Configuration instances, signing isolation, shared runtime comment validation, multibyte passwords and configured/cancelable client requests are covered.

Client build passes with seven remaining lint warnings and existing dependency-tooling warnings. Diff whitespace check passes. No live database integration or browser E2E validation performed. No dependency upgrades, sessions redesign, CI or container changes. No commit, push or PR.

## Remaining

Real Mongo integration, fuller public API documentation, session and dependency hardening remain outstanding. UML conception review follows collaborative requirements framing rather than mechanically documenting legacy code. No generic service/repository layer was introduced.
