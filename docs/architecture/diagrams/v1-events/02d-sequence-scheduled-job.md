# Sequence diagram — v1-events — Scheduled maintenance job

> **Feature**: epic #41 — HappiHub V1 conception package
> **Source specs**: [V1 use cases](../../specs/v1-use-cases.md) UC8, UC20, UC27, UC31; J3 D3
> **Related**: [class diagram](04-class.md), ADR-0001 (sessions, CSRF)

Status: validated on 2026-10-15 after review (owner delegated keeping the highest-scored options; see the review table in [04-class](04-class.md#review--class-and-sequence-diagrams-2026-10-15)).

## Context

The one hourly job behind every time-based rule. Emails go through the outbox (Q2).

## Diagram

![Scheduled maintenance job](02d-sequence-scheduled-job.svg)

Source: [02d-sequence-scheduled-job.puml](02d-sequence-scheduled-job.puml).

## Notes

- Rules: archiving (J3 D3), suspension end (AD2), draft cleanup with notice (S2), dormant key revocation with notice (I1), closed association deletion only without active suspension (F2, S1), 12-month log purge (J4 D4), invitation expiry.
- Triggered by an internal timer through `runOnce()` and images deleted through `FileStore`
  ([component diagram](03-component.md) CP1, CP3), updated 2026-10-15 after the component
  review and revalidated by the owner.
- Deletion order (scored 4.85): images first, then data with the selection criterion
  re-checked, so a crash never orphans files and a draft edited meanwhile is kept (it falls
  back to its poster style). Rejected: mark-then-delete (4.1, changes the validated class
  diagram); data first with an orphan sweep (3.15); data first alone (2.7, orphaned files).
- Idempotent bounded batches under a single-instance lock: a crash is safe and the next run resumes.
- Archived visibility does not wait for the job: public reads also compare the end date, so an event never shows as upcoming once it has ended.
