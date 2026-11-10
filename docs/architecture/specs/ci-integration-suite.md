# Integration suite with PostgreSQL in CI (#373)

This study adds the server integration suite, with its 80 % branch floor, to GitHub CI.

Status: **validated by Benoît on 2026-11-06** (D1 option A, 465/500), including the explicit
authorization to change `quality-tests.yml`; **superseded by
[ADR-0005](../decisions/0005-local-first-ci.md) on 2026-11-10** (#410: the workflow is deleted, the
suite runs in `just integration`, called by `just gate` and `just nightly`).

Related: [test environment](test-environment.md), [e2e-smoke-tests](e2e-smoke-tests.md)
(its CI job is the separate follow-up #400), issue #373 (found during #307).

## 1. Cause

`.github/workflows/quality-tests.yml` runs only the server unit suite
(`jest.config.cjs`). `npm run test:integration` (`jest.integration.cjs`, 222+ tests against
PostgreSQL, `coverageThreshold.global.branches: 80` added by #307) runs only on a developer
machine, so a pull request can break an integration test or drop the branch floor with a
green CI.

The harness already supports two provisioning paths (`server/tests/integration/globalSetup.cjs`):

- `TEST_DATABASE_URL` set: use that existing empty database (comment: "CI service container");
- unset: start the pinned `postgres:17.6-alpine@sha256:ef257d85…` with `docker run --tmpfs`,
  removed by `globalTeardown.cjs`.

The first path has never run anywhere.

## 2. Decision D1: where and how the suite runs

Criteria and weights (/100): isolation and parallel feedback 20, fidelity to the local
database (same image digest) 20, simplicity of the workflow change 25, CI time 10, design
intent (issue asks for a service; exercises the untested `TEST_DATABASE_URL` path) 25.

| Option | Isolation 20 | Fidelity 20 | Simplicity 25 | Time 10 | Intent 25 | Total /500 |
| --- | --- | --- | --- | --- | --- | --- |
| **A** new `integration` job, `services: postgres` (same digest), `TEST_DATABASE_URL` | 5 own job, runs in parallel, failure named | 5 same digest | 4 service block + env, ~25 lines | 4 parallel; one extra `npm ci` | 5 matches the harness comment and the issue | **465** |
| B steps added to the existing `test` job with the service | 2 one job grows, failures mixed | 5 same digest | 4 same lines minus job header | 3 serial, job time grows | 5 same path | 395 |
| C new job without service, `globalSetup` runs `docker run` | 5 own job | 5 same digest | 5 only `npm ci` + `npm run test:integration` | 4 parallel | 2 leaves the `TEST_DATABASE_URL` path untested, ignores the issue | 415 |

Sensitivity: A stays first unless simplicity reaches 40 and intent drops to 10 (then C 460,
A 450). Recommendation: **A**.

## 3. Design (option A)

```yaml
  integration:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    services:
      postgres:
        image: postgres:17.6-alpine@sha256:ef257d85f76e48da1c64832459b59fcaba1a4dac97bf5d7450c77753542eee94
        env:
          POSTGRES_PASSWORD: happihub-test   # disposable CI-only database, not a secret
          POSTGRES_DB: happihub_test
        ports: ['5432:5432']
        options: >-
          --health-cmd "pg_isready -U postgres" --health-interval 2s
          --health-timeout 5s --health-retries 30
    steps: checkout (same pin), setup-node 22.23.3 (same pin, server lockfile cache),
           npm ci --ignore-scripts, npm run test:integration
           with TEST_DATABASE_URL=postgres://postgres:happihub-test@127.0.0.1:5432/happihub_test
```

- Same permissions (`contents: read`), same action pins, no secret.
- The image digest is pinned in several files (both harnesses, both compose files, the
  workflow); no automated bump exists, so a bump updates every pin listed by
`git grep -nE 'postgres:[^ ]*@sha256'`
  together (noted in CONTRIBUTING.md next to the integration command).
- A main-push run is eligible for the SonarQube collector only when the whole workflow
  succeeds (`docs/SONARQUBE.md`), which now includes the `integration` job: a red integration
  job means no scan for that SHA. This is intended.
- Out of scope: uploading `coverage/integration/lcov.info` to the coverage artifact
  (the coverage artifact contract is unchanged), the E2E job (#400).

## 4. Acceptance criteria

1. On every push and pull request, a job named `integration` runs `npm run test:integration`
   against the service and fails when a test fails or branch coverage drops below 80 %.
2. The service uses exactly the image digest of `globalSetup.cjs`.
3. No container is started by `globalSetup` in CI (the `TEST_DATABASE_URL` path is taken;
   checked by reading the job's `env`, since a missing URL would fall back to `docker run`).
4. Local check: the same command passes with Node 22.23.3 against a manually started
   container of that digest through `TEST_DATABASE_URL`.
5. The job is green on the pull request.

UML: none; a single CI job adds no behaviour to the product (proportionality).
