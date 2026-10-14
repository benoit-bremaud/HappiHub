# Trusted ingress client address — correction conception

Status: validated by the owner on 2026-10-13; implemented and locally verified; publication pending.
Date: 2026-10-13. Applies to recovery PR #257 at dbf3b6.
Work item: [unresolved P1 review concern](https://github.com/benoit-bremaud/HappiHub/pull/257#discussion_r4251443252).
Decision: [ADR-0002](../decisions/0002-normalize-client-address-at-ingress.md).
This amends the ingress realization of the accepted cookie-session requirements D2/D10,
without changing their session lifetime, CSRF, rate-limit values or authentication API.

## Evidence and classification

Verified exact, P1 Must Have. client/nginx.conf:8 uses proxy_add_x_forwarded_for;
docker-compose.prod.yml passes only Nginx's IP as TRUSTED_PROXY; server/app.js:21 trusts
that address. The login/bootstrap limiters at app.js:38-39 use the resolved client IP.

Using the installed proxy-addr dependency with a simulated Nginx socket 10.254.240.2,
forwarded addresses `192.0.2.10, 10.254.240.1` and `192.0.2.20, 10.254.240.1` both resolve
to 10.254.240.1. These are synthetic addresses. This reproduces address selection;
it is not a live production load test. Existing limit tests exercise one client, and
existing secure-cookie tests exercise one proxy, so neither tests this chain.

The existing built happihub-prod-audit-client runtime reports Nginx 1.30.5 with
--with-http_realip_module. This is a capability check, not acceptance of the proposed
configuration or proof the older built image is identical to the current source.

## Need and use cases

UC1 — Sign in without consuming another network client's quota (extends the existing
session sign-in goal, not a new feature). Actor: visitor. Precondition: controlled TLS
ingress, valid deployment configuration, single API instance. Success: visitor A's
failed attempts cannot exhaust visitor B's quota when their rate-limit keys differ
(distinct IPv4 addresses, or IPv6 addresses outside the same configured subnet group;
see R7 for the NAT and IPv6 grouping exceptions).
Minimal guarantee: ambiguous/untrusted forwarding does not select an arbitrary identity.

UC2 — Configure the trusted ingress boundary. Actor: operator. Supply the exact trusted
peer as observed by Nginx, validate configuration and the two-client/spoof tests, then
request deployment acceptance. Missing/invalid configuration blocks startup or API access.
A host Docker NAT address can represent the controlled edge rather than its process IP;
this does not authenticate individual host processes. The host administrator is trusted.

## Requirements and concrete contract

R1. Keep Express trustedProxy equal to the explicit runtime Nginx IP; local mode continues
with no forwarded-header trust. No Boolean true, broad subnet, hop-count or first-header
shortcut is introduced.

R2. The public TLS edge owns client address provenance. It overwrites X-Forwarded-For
with the transport client's literal IP, without a port, and strips/overwrites visitor
X-Forwarded-Proto, X-Forwarded-Host and X-Real-IP before forwarding. Additional CDN/proxy
hops require a separate trust review; do not silently extend the chain.

R3. Nginx loads an operator-owned read-only file at
/etc/nginx/happihub/trusted-ingress.conf, included in server context. It contains an
explicit set_real_ip_from directive for the peer observed by Nginx (one exact IPv4 or
IPv6 address for this baseline). Use X-Forwarded-For as real_ip_header and
real_ip_recursive off: the controlled edge supplies the authoritative final address.
The Nginx parser owns address parsing; do not write a custom IP parser.

R4. In location /api/, reject with 403 before proxy_pass when remote_addr still equals
realip_remote_addr. This covers an untrusted peer, missing/unparseable final forwarded
address, or an address equal to the trusted peer. The last case is deliberately rejected:
the gateway's own identity is not a valid visitor identity for this baseline. Verify
this guard in the actual pinned runtime before declaring the design implemented.
After successful normalization, overwrite outgoing X-Forwarded-For with remote_addr
only; do not append the original chain. Continue the existing fixed HTTPS scheme contract.
Overwrite X-Forwarded-Host from the controlled Host and clear X-Real-IP/Forwarded on the
API hop to avoid alternative caller-controlled identity channels. This does not add
application use of these headers.

R5. Keep API/database unpublished and the static web port on host loopback. The upstream
TLS edge remains required. The read-only ingress file is trusted operator configuration,
not user input: forbid wildcard trust, extra directives or broad private ranges in its
review procedure. A local malicious host process is outside this network trust boundary.
The container's root health check remains available without API forwarding headers.

R6. Compose requires HAPPIHUB_TRUSTED_INGRESS_FILE, an absolute path to the operator's
configuration. Use a read-only long-syntax bind mount with create_host_path false.
The image includes no usable permissive default. Missing file causes Compose/startup
failure. An empty file cannot normalize any address, so API traffic is rejected.
Malformed Nginx configuration fails nginx -t. The checked-in example uses a documented
synthetic peer requiring operator replacement; it must never claim to be production-ready.
Do not generate configuration by unsafe string interpolation or add a runtime templating service.

R7. Limit values stay 20 login and 120 bootstrap requests per 15 minutes, including the
existing 429/Retry-After behavior. IPv6 grouping remains express-rate-limit's configured
behavior: distinct IPv6 addresses inside one configured subnet group share a single
limiter key, exactly like separate persons sharing a NAT IP. One API instance remains
required; this design introduces no distributed store or account lockout.

## Data, errors and operational boundary

Client IPs are personal data and used transiently for trusted forwarding and existing
in-memory rate-limit keys. No database migration, additional retention, analytics or
raw-IP debug logging is introduced. Synthetic test results may record documentation IPs.

R8. Nginx access logging. With the real-IP rewrite, the default `$remote_addr` access log
would record visitor addresses instead of the gateway peer and retain them in container
logs. The ingress configuration must set `access_log off;` (error logging stays enabled
at its default level). Re-enabling access logs requires a separate privacy decision with
an explicit retention period. Implementation is tracked as a follow-up; the wider
deployment-wide logging policy has still not been audited.

403 means forwarding could not establish the required boundary. 429 means the resolved
client quota is exhausted. Authentication, CSRF and session-store failures retain their
existing contracts. No IP/header detail is returned in generic error responses.
The existing transport topology still needs production security acceptance; this repair
neither deploys it nor grants a new exception for its internal plaintext hops.

## Files and implementation boundaries

| File | Planned change |
| --- | --- |
| client/nginx.conf | Required trusted-peer include, real-IP directives, API rejection guard, canonical forwarding headers |
| docker-compose.prod.yml | Required read-only trusted-ingress file bind; retain existing network/port boundaries |
| docker/nginx/trusted-ingress.conf.example | New documented synthetic set_real_ip_from example |
| server/tests/proxy-boundary.test.js | New focused Express regression for canonical forwarded identities, direct spoof rejection and independent limits |
| tools/ingress/test_ingress.py | New opt-in stdlib orchestration of disposable gateway/Nginx/Express fixtures; no production volumes or credentials |
| docs/DOCKER.md and docs/CONFIGURATION.md | Operator file, exact-peer discovery, edge overwrite contract, failure/rollback instructions |
| docs/architecture/specs/cookie-sessions.md and ADR-0001 | Cross-reference the accepted correction after validation; preserve earlier approval history |
| docs/HANDOVER.md and PROJECT_LOG.md | Record verified outcomes and pending review/merge state |

No change to Express trust parsing or default limits. No automatic code fixes, CI
pipeline edits, branch merge, deployment, account change or timer activation is part of
this approved correction. New tests use existing test tools; the optional Docker fixture
must not be included inadvertently in the non-Docker collector unit-test discovery.

## Verification and traceability

| Requirement / scenario | Planned verification |
| --- | --- |
| R1/R4 direct trust boundary | Direct untrusted Express peer cannot set client IP via XFF; trusted Nginx's single canonical address is honored |
| R2/R4 spoof resistance | At the controlled edge, visitor-forged XFF/host/scheme/real-IP cannot alter the resulting identity or Secure-cookie policy |
| R3/R4 actual Nginx behavior | Disposable two-hop fixture sends two synthetic network identities through the production nginx.conf; inspect only synthetic response identities |
| R4 bad provenance | Untrusted Nginx peer, missing XFF, malformed final address, or peer-as-client receives 403 and never reaches API |
| R5 isolation | API/database have no published port; root health check works; existing local mode still ignores spoofed scheme |
| R6 configuration | Missing path/file and invalid config fail validation/startup; empty trust file rejects API; exact IPv4 and IPv6 peers supported |
| R7 quota independence | 20 failed A logins then 21st A -> 429; B's first attempt remains normal; repeat bootstrap at 120/121; rotating spoof headers cannot bypass A's limit; two IPv6 addresses in one subnet group share a quota |
| R8 access logging | Rendered ingress configuration contains `access_log off;`; a request through the chain adds no access-log line containing the client address |
| Session compatibility | Existing server/security/session/integration tests pass; trusted HTTPS path still issues Secure HttpOnly SameSite cookie |
| Supply-chain/runtime | nginx -t using the pinned image, Compose config validation, targeted Docker fixture, diff/secret review |

The two-hop fixture must use the real Nginx directives, not just a mocked proxy-addr
function. Bind only disposable loopback ports if needed, use unique fixture names,
synthetic data and no shared volumes. Cleanup may remove only fixture resources created
for this check, with applicable deletion authorization. No cleanup of existing services.

Deployment procedure (separately authorized): configure the outer edge's overwrite
policy, supply the exact peer file, validate nginx -t and two-client tests, then promote
the reviewed images. If normalization fails after rollout, stop promotion or revert to
a previously verified safe ingress; do not restore broad trust or disable rate limiting.
No database/session migration or credential rotation is inherently required.

## UML and four-pass review

- [Sequence](../diagrams/trusted-ingress-client-address/01-sequence.md): critical multi-hop
  flow, failure branches and quota isolation; annotates personal/sensitive data.
- [Deployment](../diagrams/trusted-ingress-client-address/02-deployment.md): physical
  peers, file and network boundaries. No new class model or state machine is justified.
  Textual UC1/UC2 reuse the session epic; no duplicate use-case diagram is needed.

Requirements/traceability: R1-R8 map to the tests above; the original two-client gap is
explicit. Clean/SOLID: transport normalization stays at Nginx; application quota policy
stays in Express. KISS/YAGNI/DRY: use the existing real-IP module, one operator trust file,
no proxy service, IP parser, abstraction layer or copied limiter. Patterns/security:
existing reverse proxy is the justified adapter; whitelist peers and reject ambiguity.

Local implementation evidence on fix/security-boundaries: 105 server tests and seven
real two-hop Docker scenarios passed, including the Nginx rejection guard and exact IPv6
peer handling. Compose validation passed. Publication/review acceptance remains pending. Verify real peer representation at the chosen deployment before
any release; host NAT versus container routing is environment-dependent.

## Option comparison

Scores are engineering judgments on a 1-5 scale, not measured safety probabilities.
Safety/provenance 40%, fit with existing boundaries 25%, effort 20%, operability 15%.

| Option | Safety | Fit | Effort | Operability | Weighted total / 5 |
| --- | --- | --- | --- | --- | --- |
| A: Nginx normalization and exact edge peer | 5 | 5 | 3 | 4 | 4.45 |
| B: validate and trust both exact peers in Express | 5 | 3 | 4 | 4 | 4.15 |
| C: defer repair until deployment | 1 | 2 | 5 | 1 | 2.05 |

A preserves the already accepted application trust boundary. B is credible and could
win if changing outer topology is a recurring application requirement; current evidence
shows only one deployment baseline. Deferral does not satisfy merge readiness. Blanket
trust/hop-count approaches are excluded by the security constraint rather than scoring.

## Sources

- [Express trusted proxies](https://expressjs.com/en/guide/behind-proxies/).
- [Nginx real-IP module](https://nginx.org/en/docs/http/ngx_http_realip_module.html).
- [Recovery source](https://github.com/benoit-bremaud/HappiHub/tree/dbf3b6004c52e5816dba3d496a6310fbfe337fcb).
