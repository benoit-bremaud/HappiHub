# Ingress correction verification — 2026-10-13

Scope: owner-approved correction of PR #257 review comment 4251443252, against
recovery baseline dbf3b6. No application feature, merge or deployment.
Conception: trusted-ingress-client-address specification, ADR-0002 and two UML views,
accepted October 13 and maintained on the separate codex/quality-followup-conception branch.

## Result

Nginx now normalizes addresses from one explicitly trusted outer peer and forwards one
canonical client address. Untrusted/missing/malformed forwarding fails with 403 before
Express. Express retains its existing trusted Nginx IP and authentication quota values.
Controlled Host/scheme overwrite and removal of alternative forwarding headers prevent
caller-supplied identity metadata from surviving the trusted edge.

Production Compose requires HAPPIHUB_TRUSTED_INGRESS_FILE and a read-only existing-file
mount. No default broad trust, exposed API port, database migration or new dependency.
The default source example contains only an explicitly labelled documentation address.
The actual gateway IP remains deployment-specific, particularly with host Docker NAT.

## Verification evidence

- Five focused Express regressions passed: IPv4/IPv6 canonical identity, untrusted peer,
  independent IPv4 and IPv6 subnet login quotas, independent session-bootstrap quotas.
- Full server suite: 105 tests in nine suites passed, including real disposable MongoDB
  integration tests. Command: npx --no-install jest --config jest.config.cjs --runInBand
  --coverageDirectory=/tmp/happihub-ingress-server-coverage, from server/.
- Seven opt-in Docker ingress scenarios passed using actual current nginx.conf and
  Express modules mounted read-only, a real HTTPS edge and each image's default non-root
  user. The certificate is ephemeral and explicitly trusted by the test clients; TLS
  verification is not disabled. Session storage alone is replaced by MemoryStore.
- Confirmed: two client identities, spoof-header replacement, 20/21 login and 120/121
  bootstrap boundaries, IPv6 client and exact IPv6 gateway trust, untrusted direct API
  semantics, Secure/HttpOnly/SameSite cookies, missing/invalid/empty trust configuration,
  root health and no published fixture ports. No fixture debug endpoint ships in the app.
- Docker fixtures use existing happihub-prod-audit-server (c116ddf3c276) and
  happihub-prod-audit-client (ceba19051ca9); image IDs are resolved once. These checks
  validate mounted current modules/configuration, not a newly rebuilt production image.
- Compose configuration with synthetic inputs verifies the required ingress variable,
  read-only mount, create_host_path:false, loopback-only web port, and no API/Mongo ports.
- Owned fixture containers/network were cleaned after both runs; no shared volumes,
  real credentials or existing services were used. No live SonarQube analysis was run.

Frontend JS/JSX and dependencies are unchanged, so earlier client tests/build evidence
is retained, not presented as freshly rerun. The known client lint error/two warnings
remain outside this correction; dedicated lint/typecheck scripts do not exist.
Coverage from this server command is scoped by existing Jest settings; it is not the
full-source Sonar coverage command or a Sonar quality-gate result.

## Structured local review

| Classification | Finding / evidence | Disposition |
| --- | --- | --- |
| Must Have | Review 4251443252: proxy_add_x_forwarded_for plus one trusted peer collapsed visitor quotas | Corrected at Nginx; real two-hop tests verify distinct quotas and spoof resistance |
| Must Have | Missing trusted peer must not turn into arbitrary forwarding trust | Required include and existing-file mount; fail-closed startup/API cases verified |
| Should Have | Test-only identity endpoints and session state must not ship | Fixtures created at execution time; current app source contains neither endpoint nor MemoryStore default |
| Should Have | Test runner cleanup could affect other stacks | Unique invocation names and ownership label checked before removing only tracked fixture resources |
| Should Have | Exact observed gateway is deployment-dependent | Documented operator requirement; no guessed default or production readiness claim |
| Deferred | Client lint baseline and supported engine migration | Separate accepted ESLint study, no unrelated rule/source changes |

Review is a structured local self-review, not an independent approval. No paid review
service is required. The existing full recovery audit remains relevant for unchanged
source; publication still requires the complete branch review and owner authorization.

## Pending actions

Publish the accepted conception separately and the correction to recovery PR #257 after
owner approval. Reply to the original review comment with this evidence and the commit
SHA; leave conversation resolution to the human author. Then re-fetch reviews/checks.
Recovery and SonarQube PRs still require explicit merge decisions and hosted CI verification.
The local SonarQube timer remains disabled; activation is a separate operation.
