# ADR-0003 — PostgreSQL as the V1 primary database

Status: accepted by the owner on 2026-10-16.

## Context

MongoDB/Mongoose was the inherited baseline, never an approved decision. The validated V1
model (04-class, 06-data-flow) is relational and needs atomic multi-record writes (outbox,
account deletion cascade, invitation acceptance). Constraints: zero budget, EU hosting, GDPR.

## Decision

Use PostgreSQL, self-hosted in the EU next to the API process, as the single V1 store,
including server sessions. Start from an empty V1 schema; archive any legacy Mongo dump.
Port the frozen participation and comment features as two minimal tables. The full MCDA
(PostgreSQL 435, SQLite 385, Defer 325, MongoDB 315) and the target schema are in the
[data and migration study](../specs/v1-data-migration.md).

## Consequences

The data access layer, session store and integration tests are rewritten in the first data
brick (accounts and associations). The data access library and migration tool are chosen in
that brick's conception. ADR-0001 keeps its session rules; only its store changes from
connect-mongo to a PostgreSQL session table. Hosting (T11b) must provide PostgreSQL and
nightly dumps. Fallback: SQLite with the same schema, cheap before the first data brick.
