# ADR-0004 — Encrypt sensitive data at rest in PostgreSQL

Status: **proposed** on 2026-10-23; decisions D1–D7 validated by the owner the same day,
final conception validation pending (#310).

## Context

PostgreSQL (ADR-0003) stores account emails, pending emails, display names, invitee emails,
association contact emails and outbox messages (recipients and live verification/reset/invitation
links) in clear. Passwords (bcryptjs) and link tokens (SHA-256) are already hashed. The owner
wants sensitive data encrypted, ideally everything, and chose on 2026-10-22 the layered scope
(option A, 405/500). Constraints: zero budget, EU hosting, GDPR art. 32, no production data yet.

## Decision

- Storage and backups encrypted at the host level (requirement on the hosting choice, T11).
- Production database connections over a Unix socket/loopback or TLS `sslmode=verify-full`.
- Application-level AES-256-GCM envelopes `hh1.<kid>.<b64url>` with AAD `table.column` on the
  personal columns of the [specification](../specs/db-encryption-at-rest.md) § 2, and an
  HMAC-SHA256 blind index (dedicated key, `foldEmail` normalization) for email uniqueness and lookups.
- Keys in a keyring file outside the repository and database, path from the environment;
  staged rotation by key id with a re-encryption job.
- Session table and public event content stay clear; sessions carry no personal data.

MCDA for each choice (D1–D7) is in the specification § 10.

## Consequences

Email columns lose their SQL `CHECK lower` and plain indexes; normalization moves to the domain.
Losing the keyring loses the data, so it is escrowed separately from backups. A full compromise
of the API host still exposes data (keys in memory). Fallbacks: D2 keys as environment values
(410/500); D1 A' personal columns plus activity detail (385/500).
