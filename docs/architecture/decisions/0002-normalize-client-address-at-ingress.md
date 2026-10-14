# ADR-0002 — Normalize client addresses at the controlled ingress

Status: accepted by the owner on 2026-10-13.
Context: [PR #257 review](https://github.com/benoit-bremaud/HappiHub/pull/257#discussion_r4251443252).

## Problem

The documented TLS edge -> Nginx -> Express chain appends the edge address to
X-Forwarded-For. Express trusts only Nginx, so rate limits group unrelated visitors
under the edge IP. The accepted session contract requires per-client-IP limits.

## Decision

Normalize the address at Nginx with its existing real-IP module and an explicit,
operator-supplied trusted edge peer. Forward one normalized address to Express;
retain Express's narrow trust in Nginx alone. Reject API requests for which the
peer was not trusted or no address replacement took place. Require a reviewed
read-only ingress configuration file; do not invent a default peer or trust all
private networks. The TLS edge overwrites visitor-supplied forwarding headers.

See the [detailed specification](../specs/trusted-ingress-client-address.md), which
owns contracts, limitations, migration, planned tests and the implementation file map.

## Alternatives

- Explicitly trust both proxies in Express: viable with validated exact IPs, but adds
  outer-deployment knowledge to application configuration and changes the existing
  narrow trust contract. The current single-IP/CIDR validator cannot accept that list.
- Defer until production deployment: avoids immediate configuration work but leaves
  an acknowledged security defect in the recovery baseline and blocks merge readiness.
- Trust all proxies or a hop count: rejected because attacker-controlled headers or
  shorter network paths could then determine the limiter identity.

## Consequences

One additional operator-controlled read-only file is required for the production
baseline. No new dependency, service, database field or account/session contract.
Users sharing a genuine NAT public IP still share a limit; this repair cannot make
IP-based throttling per-person. Multi-replica/distributed counters remain separate.
No production deployment or additional plaintext transport exception is authorized.
