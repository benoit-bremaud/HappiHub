# HappiHub local SonarQube collector — conception

2026-10-13. Status: owner approved conception and narrow local HTTP exception on 2026-10-13.
Work item: #25; recovered application source prerequisite: PR #257 (not merged).
Supersedes the GitHub self-hosted runner topology in sonarqube-push-analysis.md.

## Accepted objective and decision

Hosted tests on every push and PR; local Community Build analysis for main push revisions.
Do not register a personal-account public-repository runner: workflow-level assignment
restrictions verified in GitHub documentation apply to organization runner groups.
A fixed local collector provides an independent eligibility boundary. No VM required.
No public server ingress, repository transfer, new agent CLI or paid edition.
Owner explicitly approved this topology and its narrow same-host transport exception.

## Actors and use cases

UC1 Contributor validates a revision: push starts hosted tests; a successful main push
becomes eligible for local scan. Preconditions: recovered tests integrated into main,
workflow enabled and collector configured. Success: exact revision analyzed, gate recorded.
Failures: failed tests are recorded as ineligible; unavailable scanner/server fails the
analysis status; incomplete artifacts fail validation. No failed case becomes green.
UC2 Maintainer inspects findings: consult local dashboard plus exact-SHA GitHub status.
UC3 Maintainer renews credentials: securely replace project-only Sonar token or repository-
scoped collector token; validate access without revealing credentials. No admin token scan.

## Responsibilities and planned files

- .github/workflows/quality-tests.yml: GitHub-hosted server/client jobs, push and PR triggers,
  immutable source checkout, tests/coverage and SHA-bound artifact upload. No Sonar secret.
- sonar-project.properties: project happihub / HappiHub, source/test scope, LCOV paths,
  encoding, gate wait and timeout. No token. Deployed scanner configuration is trusted;
  never automatically execute or load downloaded repository scanner overrides.
- tools/quality/sonar-collector.py: fixed repository/workflow eligibility checks, serialized
  queue, artifact/source validation, scanner process boundary and exact-SHA status publication.
  Python standard library only; executable deployed from explicitly reviewed code, not fetched
  dynamically from main. Small pure eligibility/archive helpers support meaningful tests.
- tools/quality/tests/test_sonar_collector.py: provenance, zip traversal/symlink/size,
  missing coverage, queue/retry and status mapping tests; mock network/process boundaries.
- tools/quality/happihub-sonar.service and .timer: oneshot collector invoked every 60 seconds
  when the machine is awake, no overlapping instance; finite process timeout and restricted
  environment. Installation outside the repo occurs only after approval and sandbox authorization.
- docs/SONARQUBE.md: bootstrap, supported commands, expiration, operation and recovery.
- docs/HANDOVER.md and PROJECT_LOG.md: factual state, approval and verified outcomes.
No application source or shared SonarQube stack changes in this integration.

## Hosted test and coverage contract

Node 22 matched to recovered source. Install both lockfiles using npm ci --ignore-scripts.
Run server Jest directly with jest.config.cjs, --runInBand and coverage, including unit and
integration suites in one invocation: avoids separate reports overwriting or ambiguous merge.
Explicit production collection: app.js, server.js, config/controllers/middleware/models/
queries/routes/utils/validation JS and tracked TS counterparts where executable; exclude
config/test files only with a documented reason. Client CRA Jest runs CI=true,
--watchAll=false --runInBand --coverage with explicit src JS/JSX production collection.
Integration Mongo is synthetic loopback-only 7.0.40; no real connection configuration.
Client build retains the current documented warnings policy; unrelated warning cleanup excluded.

Expected reports: server/coverage/lcov.info and client/coverage/lcov.info. Artifact
happihub-coverage contains only these two reports and manifest.json with repository ID,
head SHA and run ID. Keep for 30 days. No environment files, credentials or raw user data.
Manifest is corroborating data, never the authority; verify against GitHub API metadata.
Source/test classifications are disjoint; include untested source in denominators. Source
prefix resolution must be verified in the first scan; do not concatenate LCOV blindly.

## Collector algorithm and queue

Fixed owner/repo benoit-bremaud/HappiHub; fixed deployed workflow identity/path; obtain and
persist numeric repository/workflow IDs after bootstrap. HTTPS GitHub API uses official gh
for authenticated requests/downloads; argument arrays, never interpolate API data in a shell.
Token: fine-grained, this repo only, Actions read, Contents read, Commit statuses write;
no workflow write, administration, runner registration, source write or org permissions.
Do not silently reuse a broad personal gh token for the background service.

1. Acquire exclusive local lock; load versioned local state atomically. Validate configured IDs.
2. Paginate known workflow runs after activation checkpoint. Eligibility: matching repository
and head repository IDs, event push, head_branch main, exact deployed workflow ID/path,
completed success. Exclude PRs/forks/manual dispatch and runs older than activation.
3. Record every discovered main push run and test failure; enqueue eligible runs in ascending
creation order/run ID. Use (run ID, attempt, SHA) identity; re-runs do not replace source SHA.
4. Publish pending context happihub/sonarqube to that exact SHA. One scan at a time; no
cancel-on-new-push policy or latest-main substitution. This controls local ordering, not
GitHub job start ordering. Reconcile later completed older runs and warn if analysis would
regress the canonical timeline rather than silently accepting older source as newest.
5. Download artifacts belonging to the same run. Verify repository/head IDs/SHA, run attempt
where available, expiry, expected name, artifact digest when available and manifest. Missing
or ambiguous provenance fails closed. Never choose an artifact by name across all runs.
6. Enforce ZIP allowlist: two reports and manifest, no absolute/parent paths, symlinks,
duplicate entries, encrypted entries or extra files; <=50 MiB total expanded, <=10 MiB per
report, <=64 KiB manifest. Enforce download/time bounds before extraction. Reject archive bombs.
7. Acquire immutable source SHA and full history in disposable work area with fixed remote,
no submodules, hooks or repository scripts executed. Disable external Git filters and global
Git config influence; validate SHA hex format and membership in approved main history.
Scan source as data. No npm/install/test/build command is run locally on downloaded source.
8. Validate LCOV SF entries resolve to files in the allowed source roots; reject traversal,
absolute paths and missing source; bounded record parsing. Copy deployed trusted properties
into scan area, explicitly override fixed project/SHA/report settings, ignore downloaded
scanner config. Scanner/plugins come from pinned reviewed vendor distributions only.
9. Run scanner in disposable non-root container: drop capabilities, no-new-privileges,
read-only filesystem except disposable work/tmp, PID/memory/time limits, read-only source
mount only, no Docker socket, home, credential directory or unrelated host data mounted.
The local trusted supervisor invokes Docker; downloaded code never controls Docker arguments.
SONAR_TOKEN is injected via process environment, never arguments/logs or source files.
10. Poll task/gate with bounded timeout. Map computed pass to success, computed failure to
failure, transport/token/timeout errors to error. Record analysis ID, SHA and summary locally.
11. Post exact-SHA status context; if status write fails, retain result and retry only publication,
not analysis. Record sent status before acknowledging completed processing. Cleanup only
collector-owned temporary directories, after path validation; no repository/shared-data deletion.

Polling may lag successful hosted tests by about a minute plus analysis and offline backlog.
30-day artifact expiry bounds offline recovery; do not promise unlimited catch-up. Expired
reports require a hosted rerun for the exact SHA. A crash after submission must reconcile
Sonar analysis/task identity before retry, avoiding duplicate automatic submissions.

## Local credentials and networking

Project creation uses available Administrator browser session, key happihub, main branch
main; inherit Sonar way and inspect new-code definition/profile before activation. Token
creation requires the appropriate browser confirmation/handoff; never show the returned token.
Store local tokens in a private service credential store, outside checkout, owner-only access.
Neither Sonar token nor collector token is a GitHub Actions secret in this topology.

SonarQube remains localhost:9000 for browser access. Proposed scanner transport: a new
HappiHub-only internal Docker network, no published ports, containing the scanner and an
additional SonarQube container attachment only. Do not attach the scanner to the existing
sonarqube_default network (it also contains PostgreSQL). No Docker host networking.
Network attachment must not restart SonarQube or change existing stacks/volumes; document
reattachment on shared-instance recreation. Before any token injection, verify no Internet,
workstation or DB reachability and exact Sonar endpoint identity. Failure blocks scanning.
Use scanner image sonarsource/sonar-scanner-cli@sha256:23ca0f137965d9dff2198074043fd48d386280bc5d0ccac8c8349cea4cf096a9
(local cached 12.1 image inspected). No extra scanner download required.

This dedicated same-host network uses the existing server's HTTP listener. It requires an
explicit owner-approved exception to security-policy CRYPTO-1 (TLS for all authenticated
transport). Token traffic is plaintext inside this local Docker network; privileged host
or Docker administrators could inspect it. Container isolation does not make it encrypted.
The exception is strictly this single-host scanner-to-Sonar segment, no LAN/remote exposure.
If declined, redesign TLS termination/transport before implementation; never silently
ignore the rule. Token remains project-scoped and does not grant shared-server administration.

## Quality gate, outcomes and rollback

Default Sonar way verified: zero new issues, all new hotspots reviewed, coverage >=80%,
duplication <=3%. Do not weaken gate/exclude legacy code to get green. Inspect small-change
exemptions and baseline before first scan. First analysis records an initial baseline,
not proof of changed-code coverage. Sonar does not certify Clean/SOLID.
Checks after main push cannot retroactively block its merge; no deployment or branch-
protection changes included. Collector offline leaves status absent/pending, never success.
Run-level failure does not kill discovery of unrelated pushes; retain explicit queue failures.
Rollback: stop collector/timer and hosted workflow after authorization; retain Sonar history.
Credential revocation when needed, no shared projects/volumes deletion.

## Four-pass review and validation

Requirements: accepted main-only scope preserved; exact-SHA tests/reports/status traceable.
Clean/SOLID: hosted test production, local eligibility/IO boundary and scanner consumption
are separate responsibilities; application has no quality-service dependency.
KISS/YAGNI/DRY: no VM controller/JIT registration or broad agent integration; fixed one-repo
collector rather than multi-project framework. One coverage run per application; one queue.
Anti-pattern/security: refuse workflow-selected workstation code, untrusted scan config,
latest-main substitution, broad tokens, unsafe ZIP extraction and green timeout status.

Review conclusion: revised topology stronger than personal-repo runner design.
Owner validation received on 2026-10-13; implementation may proceed within this scope.
Planned checks: helper tests for rejected PR/fork/wrong SHA/workflow; exact archive bounds;
missing LCOV/uncovered files; scanner failure/gate timeout/status retry; restart/no duplicate;
workflow actionlint and pinned SHAs; end-to-end exact-commit initial scan and service restart.

Sources: GitHub runner access controls, Actions artifact API and commit-status API checked
2026-10-13. Diagram sources are under ../diagrams/sonarqube-local-collector/.

## Approval boundary and deployment stages

Owner approval received: revised collector architecture, planned files, local Sonar project
registration, secure credential onboarding, dedicated internal network attachment and the
single-host HTTP exception above. No purchase, VM, repository runner, merge, deployment or
shared-stack file edit. Credentials are entered by the owner through a secure channel;
never pasted into chat. Browser token issuance follows action-time permission rules.

After conception approval: prepare config/collector/workflow and validate locally; register
the project, verify profile/new-code settings, obtain project token securely and perform
an explicitly identified initial scan without presenting a feature snapshot as canonical main.
Main automation activation depends on recovery PR integration and workflow availability;
no permission to merge/push/create a PR is inferred from this conception validation.
A local baseline scan must use the actual main SHA; recovery branch review snapshots, if
requested separately, need a distinct explicitly named review project and are out of scope.

## Implementation verification — 2026-10-13

Coverage artifact name includes run attempt to avoid ambiguity on hosted reruns.
A single server Jest invocation produced 100 passing tests and 84.48% line coverage;
client produced 18 passing tests and 62.27% line coverage. These are recovered-source
Jest metrics, not a SonarQube analysis or a new-code gate result.

The dedicated network uses Docker isolated gateway mode, not merely --internal, because
a plain internal bridge can still reach services bound on its host gateway. Verified
Sonar reachable, Internet/workstation/PostgreSQL/original-network addresses blocked.
Scanner digest is cached; no VM or paid service introduced.

## Delivered local preparation and remaining gate

Implementation worktree: /home/vev/Documents/02_personal/HappiHub-sonarqube,
branch codex/sonarqube-integration from main. This is the authoritative implementation;
untracked early code copies in the conception worktree are not deployed or committed here.
20 collector tests, actionlint, server/client coverage commands and client build passed
(existing legacy warnings retained). The scanner working directory is a separate disposable
writable mount so task identity survives container exit; source remains read-only. Durable
private task records allow restart reconciliation. One queue item per invocation bounds load.

HappiHub project registered, inherited gate/profile policy verified, isolated Docker network
created and probed. Owner confirmed both token issuance actions; values stored privately
outside Git with mode 600, expiration October 13, 2027. Sonar authentication and GitHub
metadata/Actions read verified without displaying values. Workflow remains absent from main.
No initial analysis, timer activation, push, PR creation, merge or deployment is claimed.

Runtime source roots are client/src and server, matching the agreed application scope.
Collector Python is validated by its own CI boundary suite; no Python coverage is claimed
in the application Sonar dashboard. Add broader tooling analysis only through a separate study.

## Conception traceability supplement

State view 04 makes the accepted persistent new/scanning/result/done phases and
status retry explicit. Data-flow view 05 identifies sensitive credentials and public
SCM author metadata crossing boundaries; actor profiles are not retained in queue state.
These clarify the already-approved algorithm and introduce no new runtime behavior.
