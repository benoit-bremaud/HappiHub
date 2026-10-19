# Local SonarQube quality control

The owner approved the local collector conception and a narrow same-host HTTP exception
on 2026-10-13. GitHub-hosted tests run on each push and PR. Only successful main push runs
are eligible for local Community Build analysis. No repository self-hosted runner or VM.

## Current state

Project `happihub` / HappiHub is registered at <http://localhost:9000/dashboard?id=happihub>.
Main branch: `main`; new-code definition inherits **Previous version**. The default
Sonar way gate requires zero new issues, all new hotspots reviewed, >=80% new-code
coverage and <=3% duplication. Language profiles are inherited from the shared instance.
`sonar.projectVersion` remains 1.0.0 until the release policy deliberately changes it;
never use each commit SHA as a new version and reset the new-code window every push.

Both local credentials were issued with owner confirmation and expire October 13, 2027.
Their authentication/read checks passed without displaying values. The dedicated scanner
network is configured and isolation probes passed. The workflow and the
recovered source are on main (PR #257). The pre-merge gate scans locally with every lcov
report (server unit, `server/coverage/integration`, client); see `review-local` reports.
No push, merge or deployment is implied by configuration approval.

## Credentials — owner-controlled, never in chat

In SonarQube, My Account > Security: generate a **Project Analysis Token** for HappiHub
only, with an expiration. Do not use an administrator/user token for scanning.
In GitHub, create a fine-grained token for **benoit-bremaud/HappiHub only**, with:
Actions read, Contents read, Commit statuses write, plus mandatory Metadata read.
No administration, runner, workflow write, repository write or organization permission.
GitHub fine-grained tokens inherently allow ordinary read access to public repositories;
only HappiHub is selected for the additional permissions, with no other private-repository access.

Store tokens outside the checkout with directory mode 700 and file mode 600. For example,
run this yourself in a private terminal (Bash); input is hidden and never placed in history:

```bash
install -d -m 700 "$HOME/.config/happihub-quality"
read -r -s -p 'HappiHub project analysis token: ' happihub_sonar_token
printf '\n'
(umask 077; printf '%s' "$happihub_sonar_token" > "$HOME/.config/happihub-quality/sonar-token")
unset happihub_sonar_token
read -r -s -p 'HappiHub fine-grained GitHub token: ' happihub_github_token
printf '\n'
(umask 077; printf '%s' "$happihub_github_token" > "$HOME/.config/happihub-quality/github-token")
unset happihub_github_token
```

These are local service credentials, **not GitHub Actions secrets**. Record expiration
privately and rotate before it. Never paste values into chat, screenshots or issue bodies.

## Isolated scanner network

Approved network: `happihub-sonar-internal`, internal bridge with IPv4 gateway mode
`isolated`. Its persistent member is only `sonarqube`. The scanner must not join
`sonarqube_default`, which also contains PostgreSQL, or use host networking.
There are no published scanner ports and no host bridge address. Verified probe checks
Sonar UP and denied Internet, host service, database and original Sonar-network access.
The collector checks topology before injecting its project token.

When the shared Sonar container is recreated, its extra attachment is lost. Reattach
without restarting it: `docker network connect --alias sonarqube happihub-sonar-internal sonarqube`.
Re-run isolation checks before restarting the collector. Do not recreate/delete shared volumes.

The narrow approved CRYPTO-1 exception is HTTP **inside this dedicated single-host Docker
network**. It is not encrypted against privileged host administrators, and authorizes no
LAN/public exposure or remote HTTP token transmission. It does not change shared-server settings.

Scanner image is pinned by digest in the collector. Source mounts are read-only, no Docker
socket or home is mounted, capabilities are dropped, and memory/PID/time bounds apply.
Host supervisors with Docker access remain trusted and powerful; container restrictions
do not claim to remove that host privilege.

## Installation and activation

Review and deploy only approved collector code into `$HOME/.local/share/happihub-quality/code`.
The background service must never run directly from an editable downloaded source checkout.
Keep deployed code read-only to normal workflow data handling; record deployed commit/hash.
Copy the service/timer into the user systemd directory after review. Use `LoadCredential`
for the two private files; the process accesses its runtime credential directory.

Copy `tools/quality/config.example.json` to the private config directory and fill absolute
paths, activation UTC timestamp and the numeric workflow ID returned by:
`gh api repos/benoit-bremaud/HappiHub/actions/workflows/quality-tests.yml --jq .id`.
Do not invent the workflow ID while the workflow is absent from main.

Verify the configuration with one foreground invocation before enabling the timer:
`python3 /absolute/approved/code/tools/quality/sonar-collector.py --config /absolute/private/config.json`.
Then `systemctl --user daemon-reload` and `systemctl --user enable --now happihub-sonar.timer`.
If Docker is unavailable, the network is wrong, credentials are missing, reports expire,
or the test workflow is absent, activation is incomplete. Do not label the project operational.
No unattended boot guarantee: a user timer needs a user manager; lingering is a separate
host setting requiring explicit authorization. The workstation must be awake and online.

## Verification and failure handling

Run collector tests: `python3 -m unittest discover -s tools/quality/tests -v`.
Run `actionlint .github/workflows/quality-tests.yml` and validate systemd unit syntax.
Hosted coverage includes production files with zero coverage. The collector validates
the exact run/attempt/SHA and normalizes package-relative LCOV sources to project-relative paths.
It never runs repository npm scripts locally. No arbitrary ZIP members or source symlinks.

Context `happihub/sonarqube` reports pending, success, failure (computed red gate), or error
(missing/invalid coverage, authentication, connectivity or timeout). This is a **commit
status**, not a Sonar job executed on GitHub. It cannot prevent a commit already pushed to
main. Branch protection and deployments are separate, unconfigured work.

Collector serializes scans, waits for earlier unfinished pushes and retains results when
GitHub status publication fails. A interrupted scan is reconciled by task identity where
possible; uncertain submission requires operator reconciliation, never a blind rescan.
Coverage retention is 30 days, so long offline periods require exact-SHA hosted reruns.

Use the private state and redacted diagnostic log to inspect failures. Do not share raw
scanner logs. Stopped/failed Docker containers are retired after a definitive scan; interrupted
ones may require controlled operator cleanup. Never remove unrelated containers.
The scanner writes task identity to a separate disposable analysis directory, not its
tmpfs: task records survive container exit and are copied into private collector state.
At most one queue item is completed per collector invocation. Diagnostic files are
redacted and truncated to 2 MiB; preserve required incident records privately before cleanup.
At first activation verify source SHA, analysis ID, coverage paths, gate and successful
exact-SHA GitHub status. No initial scan is claimed until this succeeds.

Stop automation with `systemctl --user disable --now happihub-sonar.timer` after authorization;
retain the project/history. Revoke a leaked/retired credential through its issuing service.
SonarQube does not replace manual Clean/SOLID review or the separate security CI baseline.
