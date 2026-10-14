# HappiHub event platform resumption

Status: proposed, pending owner validation. This document is the equivalent work item for initial conception; no implementation is approved yet.

Planning note (2026-10-12): the current sequencing and expanded product direction are
recorded in the [prioritized work plan](../../WORK_PLAN.md). This earlier specification
is retained as a proposal and must be reconciled with the completed framing before
it can become an approved implementation specification.

Current status note (2026-10-12): the baseline below records the initial audit, before
security repairs. The current implementation now has protected ownership/visibility,
public reads, reduced manifests, verified local Docker workflows and server-managed
cookie sessions. See the API contract and audit reports for current runtime facts.
The event-editor product conception remains proposed and unvalidated.

The owner deferred visual redesign to the later framing session and wants Clément/Yazii's
feedback included before validating that design. No contributor has been contacted.

## Objective

Resume the existing HappiHub project to publish events on a public website and offer authenticated organizers a fast creation workflow. Preserve repository identity and existing community capabilities while focusing this increment on publishing.

## Initial audited baseline (historical snapshot)

- React client with routes for registration, login, profiles, event listing, creation, and details.
- Express API, Mongoose event/user/comment models, JWT middleware, Joi validation, and validation tests.
- All event reads currently require authentication. `/public` follows `/:id`, which captures the public path as an ID.
- Event creation accepts `creator` from the request body rather than authenticated identity.
- Authentication reads `.replace()` on a possibly missing Authorization header.
- The creation component decodes a possibly missing token during render and hardcodes the API origin.
- Event moderation status exists, but there is no publication lifecycle or organizer update endpoint.
- The server manifest lists hundreds of dependencies. Installation and test execution need a baseline check before declaring the project runnable.

## Proposed scope and acceptance criteria

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| R1 | Anonymous event discovery | A logged-out visitor can browse and open published public events. Drafts and private events never appear in public responses. |
| R2 | Organizer access | Unauthenticated requests fail cleanly. An organizer can read and modify their own drafts, and cannot modify another organizer's events. Creator identity comes from verified authentication. |
| R3 | Guided creation | Organizer enters essentials, details, and visuals, previews the result, and explicitly publishes. Failed saves retain form input and display actionable errors. |
| R4 | Draft persistence | Save incomplete drafts, resume editing, and duplicate an event into a new draft owned by the current organizer. Publication validates required fields. |
| R5 | Publication lifecycle | Support draft, published, and cancelled. Cancellation remains visible on previously published public pages. Moderation and privacy remain distinct from publication status. |
| R6 | Responsive presentation | Listing, detail page, dashboard, and editor work on mobile and desktop with labeled inputs and keyboard navigation. |
| R7 | Optional AI assistance | A later increment may suggest copy and images. Suggestions require organizer acceptance, server-side credentials, and an agreed provider and cost policy. |

Open decisions: whether accounts are self-registered or invited; whether moderation approval is required before publication; current production usage and existing data; hosting; AI provider and budget. Initial design assumes existing registration is retained and does not invent a new invitation system.

## Approach and affected files

1. Baseline: inspect `client/package.json`, `server/package.json`, their lockfiles, server test configuration, database configuration, and startup. Establish reproducible build/test commands before feature changes. Any tooling migration receives a separate concrete proposal.
2. API foundation: update `server/middleware/auth.js`, `server/routes/eventRoutes.js`, `server/controllers/eventController.js`, `server/validation/eventValidation.js`, and `server/models/eventModel.js`. Separate public reads from organizer reads, enforce ownership, define publication fields, validate updates, and design an explicit legacy-data migration without automatic publication.
3. Client workflow: update `client/src/App.js`, `client/src/components/Event/*`, header/navigation, and shared styles. Add organizer dashboard and editor responsibilities as separate components, centralize the API origin, and use named exports for touched modules.
4. Tests: extend API integration coverage and client workflow tests. Cover anonymous reads, draft privacy, forged creator IDs, cross-owner updates, missing/invalid tokens, validation failures, and successful save/preview/publish.
5. UX verification: inspect the running application with Chrome DevTools, including mobile layouts and browser errors.

## Architecture and trade-offs

Keep React, Express, and MongoDB as the initial baseline. This limits simultaneous behavioral and infrastructure changes; it does not imply keeping every existing dependency or build tool indefinitely. Pure validation and lifecycle decisions remain independent of framework and database IO. Thin routes/controllers coordinate authentication, validation, and persistence. Introduce no additional service layers unless real orchestration or testability requires them.

Public response projection must exclude private account details and participant identifiers. Authenticated organizer responses are separate. Moderation approval and publication state must be checked together where approval is enabled.

Existing events require an explicit migration decision. Never silently expose all legacy events or replace their moderation status. Existing title uniqueness and date-only behavior need an owner decision before schema/index migration or scheduling changes.

AI is deferred until the core event workflow is verified because provider credentials, costs, and accepted generation behavior are not defined.

## Conception deliverables before implementation

After scope approval, produce an ADR, textual actor-goal use cases, publication sequence, event state diagram, component view, and privacy data-flow view under `docs/architecture/`. Include a class view if the finalized model introduces at least three new related types. Cross-link requirements and tests in a traceability matrix.

Review in four passes: requirements/traceability; dependency direction/SOLID; simplicity/duplication; pattern fit/anti-patterns. Obtain owner validation of the completed conception before coding. Architecture documentation receives its own PR, subject to explicit PR approval.

## Initial conception review

- Requirements: R1–R6 directly support the stated public discovery and private creation workflow. R7 remains optional.
- Dependencies: event rules stay pure; UI and database code depend on those rules.
- Simplicity: reuse the current repository and established responsibilities; defer ticketing, payments, social redesign, and AI integration.
- Pattern fit: no new framework, repository abstraction, or generic event-building engine is justified by the inspected scope.

The initial review was source-only. Subsequent runtime verification is recorded in the dated audit reports; it does not validate the proposed future editor scope.
