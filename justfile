# Local CI (#410, skill local-ci, ADR-0005): four tiers, one recipe each, no GitHub Actions and no
# AI agent needed. Nothing deploys from GitHub, so the repository keeps no workflow at all. Tools come
# from mise.toml (`just setup`); run the tiers as `mise x -- just <tier>` when the shell does not
# activate mise (the git hooks do). Tiers, budgets and contents: CONTRIBUTING.md § Local CI — the
# four tiers (L0 fast < 10 s on commit, L1 check < 3 min on push, L2 gate before every merge, L3
# nightly on the systemd user timer `happihub-local-ci-nightly.timer`).
#
# Then: `just merge <pr>` (refuses without the gate attestation on the head SHA). No `deploy` or
# `attest staging` recipe yet: no environment exists (#386); they come with the staging design.

set shell := ["sh", "-eu", "-c"]

# Semgrep Community Edition via uv, not mise: a mise pipx install needs a mise-managed Python.
semgrep := "uvx semgrep@1.184.0"
# Advisory GHSA-based waivers live in osv-scanner.toml (one entry per advisory, time-boxed, #411).
lockfiles := "--lockfile server/package-lock.json --lockfile client/package-lock.json --lockfile e2e/package-lock.json"
postgres_image := "postgres:17.6-alpine@sha256:ef257d85f76e48da1c64832459b59fcaba1a4dac97bf5d7450c77753542eee94"

# L1 by default
default: check

# Once per clone: the pinned toolchain, the three dependency trees, Chromium for Playwright, the hooks
setup:
    mise install
    cd server && mise x -- npm ci --ignore-scripts --no-audit --no-fund
    cd client && mise x -- npm ci --ignore-scripts --no-audit --no-fund
    cd e2e && mise x -- npm ci --ignore-scripts --no-audit --no-fund && mise x -- npx playwright install chromium
    mise x -- lefthook install

# L0 — the pre-commit checks on the staged files (< 10 s)
fast:
    lefthook run pre-commit

# Fail fast outside the .nvmrc Node major: a non-interactive shell does not activate mise, so another
# manager's default Node would run the suites. Fix: activate mise or run `mise x -- just …`.
[private]
node-guard:
    @node -e 'const want=require("fs").readFileSync(".nvmrc","utf8").trim().replace(/^v/,"").split(".")[0]; const v=process.versions.node; if (v.split(".")[0] !== want) { console.error("Node " + v + " found, Node " + want + " required (.nvmrc). Run: mise x -- just <recipe>"); process.exit(1) }'

# The two Dockerfiles tolerate info-level findings (DL3066 numeric user id, tracked by #361).
# Spelling (typos.toml: French content excluded or allow-listed), shell scripts, hook config, Dockerfiles
lint:
    typos
    shellcheck --severity=warning scripts/*.sh
    lefthook validate
    hadolint --failure-threshold warning server/Dockerfile client/Dockerfile

# jest.config.cjs is the coverage scope of the server; the client globs stay on the command line until
# a client-config change moves them into package.json (owner approval, AGENTS.md). The client build
# keeps CI=false: under CI=true react-scripts turns its documented legacy ESLint warnings into errors.
# Server and client unit suites with coverage, the client build, then the tests of the CI wiring itself
test: node-guard
    cd server && npx --no-install jest --config jest.config.cjs --runInBand --coverage
    cd client && CI=true npm test -- --watchAll=false --runInBand --coverage --collectCoverageFrom='src/**/*.{js,jsx}' --collectCoverageFrom='!src/**/*.test.{js,jsx}' --collectCoverageFrom='!src/setupTests.js'
    cd client && CI=false npm run build
    sh scripts/test-local-ci.sh
    sh scripts/test-attest.sh

# 172 s on the reference laptop, so L2 and L3 only (the L1 budget is 3 min).
# Server integration suite on a disposable PostgreSQL container (jest.integration.cjs: 80 % branch floor)
integration: node-guard
    docker info > /dev/null 2>&1 || { echo "integration: Docker is not running (disposable {{postgres_image}})" >&2; exit 1; }
    cd server && npm run test:integration

# Tests are excluded by .semgrepignore, waivers live in osv-scanner.toml. EIO_BACKEND=posix: semgrep-core
# otherwise opens io_uring rings charged to RLIMIT_MEMLOCK and dies with "Cannot allocate memory".
# The GCM rule is excluded until #412 declares authTagLength on the field cipher.
# SAST (Semgrep CE on the shipped sources) and known vulnerabilities in the three lockfiles
security:
    EIO_BACKEND=posix {{semgrep}} scan --config p/default --error --metrics=off --quiet --exclude-rule javascript.node-crypto.security.gcm-no-tag-length.gcm-no-tag-length server client/src e2e
    osv-scanner scan source --config osv-scanner.toml {{lockfiles}}

# Secrets in the whole git history (.gitleaksignore: reviewed historical placeholders)
secrets:
    gitleaks git --redact --no-banner .

# L1 — pre-push (< 3 min)
check: lint test security secrets

# Called by review-local § 2b (contents: CONTRIBUTING.md § Local CI). Reinstalls the three lockfiles so the
# attested SHA is tested with the dependencies it declares. The SonarQube token comes from
# ~/.config/sonarqube/analysis-token unless SONAR_TOKEN is exported (skill infra-accounts). Attests
# the head SHA captured before the first check (agents-skills ADR-0003): a HEAD moved during the run
# is refused, so do not touch the tree meanwhile.
# L2 — pre-merge on the pushed head (10–15 min): check, integration, SonarQube, E2E, images, attestation
gate:
    #!/bin/sh
    set -eu
    [ -z "$(git status --porcelain)" ] || { echo "gate: the working tree has uncommitted changes" >&2; exit 1; }
    head=$(git rev-parse HEAD)
    docker info > /dev/null 2>&1 || { echo "gate: Docker is not running (integration, E2E, images)" >&2; exit 1; }
    command -v sonar-scanner > /dev/null || { echo "gate: sonar-scanner not on PATH (system tool, skill local-ci rule 2)" >&2; exit 1; }
    token=${SONAR_TOKEN:-$(cat "$HOME/.config/sonarqube/analysis-token" 2> /dev/null || true)}
    [ -n "$token" ] || { echo "gate: no SonarQube token (export SONAR_TOKEN or ~/.config/sonarqube/analysis-token)" >&2; exit 1; }
    curl -sSf -o /dev/null --max-time 5 http://localhost:9000 \
      || { echo "gate: no SonarQube instance answering on http://localhost:9000 (docs/SONARQUBE.md)" >&2; exit 1; }
    just node-guard
    for d in server client e2e; do (cd "$d" && npm ci --ignore-scripts --no-audit --no-fund); done
    (cd e2e && npx playwright install chromium)
    just check
    just integration
    SONAR_TOKEN="$token" sonar-scanner -Dsonar.qualitygate.wait=true
    (cd e2e && npm test)
    trivy config --skip-dirs '**/node_modules' --skip-dirs .claude --exit-code 1 --severity HIGH,CRITICAL --quiet .
    docker build --quiet --target runtime -t happihub-server:gate server
    docker build --quiet --target runtime --build-arg REACT_APP_API_URL=/api -t happihub-client:gate client
    # Report-only until #416 hardens the base images (44 + 12 OS findings, none in the application code).
    trivy image --exit-code 0 --severity HIGH,CRITICAL --quiet happihub-server:gate
    trivy image --exit-code 0 --severity HIGH,CRITICAL --quiet happihub-client:gate
    echo "WARNING: trivy image is report-only, the base-image findings do not block (#416)" >&2
    sh scripts/attest.sh write gate "$head"

# Merge a PR only when its exact head SHA carries the gate attestation (agents-skills ADR-0003)
merge pr:
    #!/bin/sh
    set -eu
    sha=$(gh pr view {{quote(pr)}} --json headRefOid -q .headRefOid)
    git fetch --quiet origin "$sha"
    sh scripts/attest.sh verify gate "$sha"
    gh pr merge {{quote(pr)}} --squash --match-head-commit "$sha"

# TruffleHog cannot read a partial (blob:none) clone: refuse it before the four minutes of check + integration.
[private]
full-clone:
    @[ "$(git config remote.origin.promisor)" != true ] || { echo "nightly: partial clone, trufflehog cannot read it: git fetch --refetch --no-filter && git config --unset remote.origin.promisor && git config --unset remote.origin.partialclonefilter" >&2; exit 1; }

# L3 — nightly, systemd user timer happihub-local-ci-nightly.timer (no time budget)
nightly: full-clone check integration
    trufflehog git "file://$PWD" --no-verification --fail --no-update
    mise outdated
