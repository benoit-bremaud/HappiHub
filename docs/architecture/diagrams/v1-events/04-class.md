# Class diagram — v1-events — domain model

> **Feature**: epic #41 — HappiHub V1 conception package
> **Source specs**: [V1 use cases](../../specs/v1-use-cases.md), [V1 user journeys](../../specs/v1-user-journeys.md),
> [V1 product framing](../../specs/v1-product-framing.md)
> **Related ADRs**: ADR-0001 (sessions stay outside the domain model)

Status: validated by the owner on 2026-10-15 (conception workshop 4).

## Context

Domain entities, value objects and their relationships for the 33 V1 use cases. It does not
fix the database technology (#246), indexes, API payloads or sessions.

## Diagram

![cd — HappiHub V1 domain model](04-class.svg)

Source: [04-class.puml](04-class.puml).

## Notes

- `Account.platformRole` is an attribute (NONE, MODERATOR, SUPER_ADMIN): one delegable role
  does not justify a role entity. Invariant: at least one SUPER_ADMIN.
- `Membership` is the many-to-many link of M1; an association has at least one member; an
  account creates at most 5 associations.
- `Event.hiddenByModeration` is a flag, not a lifecycle state, so restoring returns the event
  to its previous state (UC29). `version` supports optimistic concurrency (J4 D2);
  `scheduleChangedAt` drives "Updated on" (J3 D1). Lifecycle: see the state diagram.
- `Image.altText` added for WCAG (S7). An event shows either its image or its `posterStyle`.
- `ModerationDecision` is the moderation log; `ActivityEntry` is the association log
  (12 months, no IP address, actor shown as "former member" after deletion).
- `ApiKey.secretHash` only; the secret is shown once (J6 D2). At most 5 keys per association.
- Decisions (validated 2026-10-15, scored and confronted):
  - C1 Venue is a value copied into each event, with suggestions from the association's past
    venues (4.4). Rejected: shared venue by reference (3.6, editing rewrites past events).
  - C2 Two dispute classes: `RemovalDispute` (resolved by a moderator) and
    `ModerationDispute` (contests a `ModerationDecision`, resolved by the super administrator)
    (4.5). Rejected: one class with a kind (3.5, hides two processes behind conditions).
  - C3 `ModerationTarget` value object {kind, id} shared by Report, ModerationDecision and
    Suspension (4.3). Rejected: three optional references with exclusivity rules (3.6).
