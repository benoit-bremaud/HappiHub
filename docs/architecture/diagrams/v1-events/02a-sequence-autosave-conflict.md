# Sequence diagram — v1-events — Save an event edit with concurrent changes

> **Feature**: epic #41 — HappiHub V1 conception package
> **Source specs**: [V1 use cases](../../specs/v1-use-cases.md) UC16, UC17
> **Related**: [class diagram](04-class.md), ADR-0001 (sessions, CSRF)

Status: validated on 2026-10-15 after review (owner delegated keeping the highest-scored options; see the review table in [04-class](04-class.md#review--class-and-sequence-diagrams-2026-10-15)).

## Context

Every save, autosave included, is a conditional write on the event version. Not covered: creation of the first draft (plain insert).

## Diagram

![Save an event edit with concurrent changes](02a-sequence-autosave-conflict.svg)

Source: [02a-sequence-autosave-conflict.puml](02a-sequence-autosave-conflict.puml).

## Notes

- Q1 (validated, 4.6 vs browser-side merge 2.8): the server merges field by field. A field conflicts only when its current value differs from the original value the browser loaded, so concurrent edits of different fields merge silently (J4 D2).
- The conditional write makes check-and-update atomic; the merge retry is bounded.
- T4 (#247): a suspended account is refused like a suspended association; its sessions are revoked (UC31) and a new sign-in only reaches "My account" (UC5, UC6, UC9).
- `scheduleChangedAt` is set in the same write when a published event's start, end or venue changes (J3 D1).
