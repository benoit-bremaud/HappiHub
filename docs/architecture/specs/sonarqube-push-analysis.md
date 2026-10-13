# SonarQube push analysis — integration conception

Date: 2026-10-13. Status: scope A accepted; earlier runner proposal superseded.

Current proposal: [local collector conception](sonarqube-local-collector.md).
This file preserves the initial investigation; its runner topology is not authoritative.
Work item: existing GitHub issue #25; tooling dependency #248.

## Need and verified constraints

The owner now requests local SonarQube quality control on pushes, superseding the
previous deferral. No configuration implementation is approved by this document.

Verified: shared localhost:9000 server is UP, version 26.5.0.122743, Community Build;
HappiHub is public, default branch main, zero repository-level registered runners.
No .github workflows or sonar-project.properties exist in the recovery checkout or
local main. Anonymous API lookup returns 401. The authenticated Administrator Chrome session
shows all five projects; HappiHub is absent, so registration is required.
No HappiHub local token file was found in the documented token directory. Administrator UI access is available; credentials have not been accessed. The optional sonar agent CLI is absent; installing
it is unnecessary for scanner-based CI and excluded from this scope.

Community Build supports main analysis only, not separate branch/PR analysis. Scanning
feature snapshots into the same main project would corrupt its meaning and is excluded.
GitHub-hosted localhost is not this workstation's localhost. A colocated or privately
connected execution environment is necessary; public SonarQube exposure is excluded.
The current container publishes port 9000 on all host interfaces. Actual network exposure
is unverified; do not describe this as loopback-only. Do not change the shared stack here.

Recovery PR #257 remains unmerged. Its recovered source/test configuration must reach
main through separately authorized review before this workflow can depend on it.

## Proposed scope A

Test every branch push and PR on disposable GitHub-hosted runners; analyze each trusted
main push in the shared local Community Build. Owner accepted this scope with “ok go” on 2026-10-13. This resolves scope only;
the documented runner deployment design remains a prerequisite before activation.
Alternatives: B, supported paid local edition for branch/PR analysis; C, cloud analysis
with source processing off-machine. Neither purchase nor migration is authorized.

## Acceptance criteria

R1: A project keyed happihub, named HappiHub, uses main as its main branch; inspect for
existing project before creating, reuse only after verifying identity and permissions.
R2: Every push/PR triggers hosted tests; main pushes additionally trigger a local scan.
No PR workflow, fork source or feature-branch source executes on the local runner.
R3: Hosted server and client jobs install lockfiles with npm ci --ignore-scripts under
Node 22 matching the recovered baseline. Tests use synthetic isolated data. Server
unit and Mongo integration suites run separately; client tests run noninteractive.
R4: Both server suites write distinct LCOV outputs, avoiding last-run overwrite. Client
coverage includes all client/src production JS/JSX, not just imported tested files.
R5: Sonar imports exact-SHA client and server reports and includes production files with
zero test coverage. Missing reports, unresolved source paths or wrong SHA fail validation.
R6: Scanner waits for the quality gate, with bounded timeout, and reports failures as a
failed job. Test failures, server unavailability and token failure never become success.
R7: No credential appears in files, logs, screenshots, chat or process arguments. Use a
project analysis token, scoped to HappiHub, through secret environment injection.
R8: Source files, revision and coverage correspond to the same immutable commit. Checkout
full history for blame and new-code evaluation. Serialize main scans without cancelling
older runs when each push is required; verify processing order against queued commits.
R9: Record first scan SHA, scope, report resolution, gate and findings without claiming
that Sonar proves Clean/SOLID or replaces manual architecture/security review.

## Responsibilities and files planned after approval

- sonar-project.properties: authoritative project identity, analysis/test classifications,
  exclusions and LCOV report paths. No token or workstation-specific absolute path.
- .github/workflows/quality-tests.yml: hosted tests on push and pull_request, exact-SHA
  coverage artifact creation, minimal contents:read permission, finite retention.
- .github/workflows/sonarqube.yml: main push only, hosted test results prerequisite,
  isolated runner scan and gate result. Prefer a single orchestrating workflow if separate
  workflows cannot guarantee prerequisite run/SHA provenance without extra infrastructure;
  final YAML topology must be validated before coding, not inferred from this proposal.
- docs/SONARQUBE.md: operational onboarding, local scan command, gate/coverage interpretation,
  runner downtime, token renewal and rollback. No new production dependency or application layer.
- docs/HANDOVER.md and PROJECT_LOG.md: verified operational state and limitations.

Topology clarification: the implementation plan is a single workflow sonarqube.yml containing
hosted test jobs and a main-only local scan job using needs. quality-tests.yml is therefore
not created. This avoids workflow_run trust/provenance complexity and duplicate tests.

## Analysis and coverage contract

Production sources: client/src and server; tests: client/src test files plus server/tests.
Use disjoint sonar source/test inclusion/exclusion patterns. Exclude node_modules, generated
coverage/build, .git and declared test/setup files from production indexing. Do not exclude
controllers, models, untested legacy files or warnings merely to improve scores. Audit any
TypeScript companion files as actual tracked source; do not hide them by default.

Coverage outputs: client/coverage/lcov.info, server/coverage-unit/lcov.info and
server/coverage-integration/lcov.info. Feed all to sonar.javascript.lcov.reportPaths.
Verify combined server report behavior on overlapping files in an initial scan; compare
unique file/line hits with Jest. If import cannot accurately combine them, amend conception
for one combined server Jest invocation instead of concatenating LCOV blindly.

Hosted command contracts: server npm test -- --runInBand --coverage
--coverageDirectory=coverage-unit --collectCoverageFrom=**/*.js (with explicit production
exclusions); npm run test:integration -- --coverage --coverageDirectory=coverage-integration
with the same production coverage collection. Client CI=true npm test -- --watchAll=false
--runInBand --coverage with explicit src production collection and exclusions. Commands
must be rehearsed after approval; glob quoting and actual Jest options need verification.
Client build follows existing documented warnings policy; do not claim a clean build or
introduce an unrelated warning-remediation scope.

## Runner and credential boundary

A disposable isolated VM runner dedicated to this repository is the deployment prerequisite.
Do not install a persistent unrestricted runner on the workstation or mount its Docker socket,
home directory, shared secret store or application data. The VM can reach SonarQube only via
a private interface and explicit port/firewall rules, plus required GitHub/scanner endpoints.
Its localhost is distinct from the host. SONAR_HOST_URL is an environment setting containing
that verified private address, never localhost assumed to work across machines.

Only trusted main push jobs run locally; hosted PR/test jobs receive no SONAR_TOKEN.
Runner identity has minimal GitHub scope; contents:read, persist-credentials:false, pinned
reviewed action SHAs, bounded job timeouts. Runner disposal between jobs and no privileged
host access are acceptance gates. No suitable runner currently verified. Its provisioned
image, private routing and lifecycle must be concretely selected and validated before
runner registration or workflow activation. This is an explicit unresolved infrastructure
precondition, not a claim that the design is deployment-ready.

Project creation/token issuance needs an authenticated administrator. Use an existing
secure session or password manager workflow; do not request secrets in chat. Project
analysis token belongs in a restricted CI secret with expiration and renewal instructions.
Do not use the administrator token as the scanner credential. Project view permissions
must be checked deliberately because the service hosts other projects.

## Quality policy and failure handling

Inspect the instance default new-code definition, quality profile and Sonar way gate before
binding the project. Propose inherited defaults, do not weaken thresholds to make the first
scan green. Old-code findings are triaged separately; no bulk suppression. Verify new-code
baseline semantics on the first scan; first scan does not establish meaningful changed-code
coverage by itself. The live default Sonar way gate was inspected in Chrome: new code has zero issues,
all new security hotspots reviewed, coverage at least 80%, duplication at most 3%.
Instance-specific small-change exemptions and new-code definition still need inspection.

Runner offline: job waits or times out, no scan success claim. Tests fail: no scan, visible
failed prerequisite. Sonar unavailable/authentication rejected: fail scan and diagnose
without leaking token. Gate timeout: failed/inconclusive, not green. Re-run exact commit
when service is restored. Never substitute latest main for the failed SHA.
Main-push checks occur after the commit reaches main and cannot retroactively prevent its
merge; they can gate downstream deployment only once an approved deploy workflow exists.
PR tests can become required checks through separately approved branch-protection changes.
No automatic merge, deployment or branch-protection change is included.

## UML and traceability

UC1 Validate a pushed revision: R2–R8, sequence and deployment views.
UC2 Inspect quality findings: R1/R9, SonarQube dashboard, deployment view.
UC3 Renew the analysis credential: R7, textual operational contract above.
Use-case, sequence and deployment sources under ../diagrams/sonarqube-push-analysis/.
Class/state diagrams omitted: no application entities or lifecycle are introduced.

## Four-pass conception review

1. Requirements/traceability: every criterion mapped above; literal every-branch Sonar scan
is not met by A. Owner must choose scope. Runner/profiles/report merging preconditions open.
2. Clean/SOLID: CI infrastructure depends on source/report artifacts; application runtime
has no Sonar dependency. Tests produce coverage, scanner consumes it, gate decides status.
3. KISS/YAGNI/DRY: one project, one workflow with jobs and one scan configuration; no new
agent CLI, shared stack, branch-per-project workaround, orchestration framework or duplicate tests.
4. Patterns/anti-patterns/security: refuse polluted main history, privileged public-repo
runner, secret-bearing PR execution, silent missing coverage and green-on-timeout behavior.
No application design pattern is warranted.
Conclusion: suitable proposal for owner scope discussion; not implementation-ready until
scope and isolated runner deployment preconditions are explicitly resolved and validated.

## Rollback and validation plan

Before activation: validate workflow syntax/action pins, coverage all-source denominator,
LCOV paths/overlap, exact-SHA artifacts, disjoint source/test sets and denied local PR execution.
First authorized scan: check dashboard revision, coverage files, gate and no token output.
Exercise test failure, bad credential, unreachable server and gate timeout paths without
modifying shared server or production data. Verify queued main scan ordering.
Rollback: disable the project workflow/runner access after authorization, preserve project
history, revoke the project token if necessary. Never delete shared volumes or projects.

## Primary sources checked 2026-10-13

- https://docs.sonarsource.com/sonarqube-community-build/feature-comparison-table
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/ci-integration/overview
- https://docs.github.com/en/actions/reference/security/secure-use
- Local sonarqube-stack/docs/onboarding-a-project.md (existing infrastructure recipe).

Confidence high: current server, repo and edition constraints. Medium: proposed workflow.
Unverified: new-code baseline, quality profile, isolated runner and LCOV merge.
Authenticated UI inspection confirms admin session, project absence and default gate.

## Runner investigation after scope acceptance

Two existing runner services are active for StudioB22 and V-SEA, not HappiHub. Do not
borrow or re-register them. QEMU and qemu-img are installed, /dev/kvm is absent,
44 GiB RAM was available at inspection; no accelerated local VM is verified.
An optional dedicated software-emulated VM is feasible to investigate, not provisioned.

Candidate deployment: dedicated disposable VM image, 4 GiB memory, 2 virtual CPUs,
non-root runner account, no host shares, no Docker socket, no inbound public access;
repository-scoped JIT runner performing one job then retired. Persist only non-secret
operational metadata outside the VM. Guest provisioning, image checksum, egress boundaries,
credential bootstrap, restart/disposal and first-job performance must be fully specified
and owner-validated before scripts or registration. No claim of full implementation readiness.

A main-only job conditional does not prevent a malicious PR workflow from addressing a
repository-level runner label. Therefore fork/workflow eligibility and runner registration
need an independent trusted provisioning boundary, not reliance on label secrecy or YAML
if alone. Main-sha/run authentication must be established before any JIT runner is offered.

Security policy requires authenticated encrypted transport. A VM must not send the Sonar
token over a bare LAN HTTP connection: use a verified authenticated tunnel or private TLS
endpoint. The existing loopback HTTP server is not permission to expose it or send tokens
unencrypted between machines. Define this in runner conception before activation.

Owner choice needed: provision the dedicated local VM, use an already isolated separate
host if supplied, or stage local manual scans while automation remains explicitly incomplete.
The current scope acceptance does not authorize changes to other projects' runners.
