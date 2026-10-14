# ADR-0001 — Server-managed cookie sessions

Status: accepted by the owner on 2026-10-12.
Ingress realization refined with owner approval on 2026-10-13: ADR-0002 and the
trusted-ingress-client-address specification, in the separate
codex/quality-followup-conception documentation branch pending integration, define
Nginx address normalization for the existing narrow Express proxy trust boundary.

## Context

HappiHub is a browser website with an existing Express/MongoDB API. Browser JWTs were
persisted in localStorage and logout could not revoke a copied token. The owner chose
server-managed sessions after reviewing the alternatives and the concrete specification.

## Decision

Use express-session with a connect-mongo store and the existing Mongo client. Regenerate
identifiers on login, revoke the stored session on logout, require CSRF and exact-origin
checks for writes, and keep authentication credentials in HttpOnly cookies. Use current
account/version lookup for role authority and password-change revocation.

Adopt 30-minute idle and eight-hour absolute authenticated lifetimes. These are product
defaults. Production requires HTTPS, a Secure __Host cookie, and an explicitly trusted
Nginx address. Local HTTP has a separate non-Secure cookie name. Do not support parallel
bearer JWT authentication after the coordinated migration.

## Consequences

Browser users must sign in again. Session storage is now an authentication dependency,
so outages fail closed. CSRF protection is required because cookies travel automatically.
Mongo TTL cleanup does not determine authorization. Process-local request counters suit
one API instance only. A multi-instance deployment needs a shared limiter.

The database technology and full event-editor architecture remain subject to the later
product conception study. This decision introduces no new database service or generic
repository/service stack. Cookie key rotation invalidates older signed identifiers.

## Specification and verification

[Authoritative specification](../specs/cookie-sessions.md) and
[local migration report](../session-migration-2026-10-12.md).
