# 04 state queue entry — Local collector

Status: clarification of the owner-approved algorithm, no new behavior.
**Superseded by [ADR-0005](../../decisions/0005-local-first-ci.md) on 2026-11-10** (#410: collector removed).
Source: [collector conception](../../specs/sonarqube-local-collector.md).

![View](04-state-queue-entry.svg)

The queue phases mirror implementation; uncertain submission never triggers an automatic rescan.
