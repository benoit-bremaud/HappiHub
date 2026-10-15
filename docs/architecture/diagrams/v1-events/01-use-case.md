# Use case diagram — v1-events — HappiHub V1 scope

> **Feature**: epic #41 — HappiHub V1 conception package
> **Source specs**: [V1 product framing](../../specs/v1-product-framing.md),
> [V1 personas](../../specs/v1-personas.md), [V1 user journeys](../../specs/v1-user-journeys.md),
> [V1 use cases](../../specs/v1-use-cases.md) (Cockburn fiches)
> **Related ADRs**: ADR-0001 (cookie sessions)

Status: proposed, pending owner validation (conception workshop 3).

## Context

Who wants what in V1. One global diagram grouped by domain; each use case is detailed in its
textual fiche. It does not show components, screens or navigation.

## Diagram

![uc — HappiHub V1](01-use-case.svg)

Source: [01-use-case.puml](01-use-case.puml).

## Notes

- Actor generalization: Association member → Registered user → Visitor; Super administrator →
  Moderator → Registered user. The super administrator alone grants or revokes the moderator
  role (UC26); a moderator handles reports, removal disputes and suspensions (UC23–UC25),
  never appoints anyone. Suspensions are logged, notified and disputable (UC27). Each actor is linked
  only to its own goals; UC1 and UC6 start before the person is a member, UC8 after removal.
- Sign-in is not a use case (Cockburn subfunction); it is the "authenticated" precondition,
  specified by ADR-0001.
- Automatic archiving is a system event, not a use case; it belongs to the event state diagram.
- Verified email is a precondition of UC5 and UC13, not an «include».
- Only one relationship: UC12 «extend» UC11 when the same field changed concurrently (J4 D2).
