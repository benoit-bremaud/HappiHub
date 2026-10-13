# Local review and credential classification — 2026-10-12

Reviewed combined changes on fix/security-boundaries against main e3e9007. Changes are prepared for local commits only; no push or PR authorized.

## Verification

64 fast server tests, 10 real MongoDB integration tests and 16 client tests pass. Client production build succeeds with seven remaining lint warnings and existing tooling warnings. Actual server.js startup succeeds against a separate disposable MongoDB instance and returns a public event array. All spawned startup/database processes stopped. git diff --check passes.

## Reconciled findings

| Classification | Finding | Disposition |
| --- | --- | --- |
| Must Have before remote release | Predictable signing values are tracked in server/.env.development:25 and server/.env.test:129. | Exposure confirmed in source; live use unverified. Prepare placeholder/ignored-local migration and assess deployed credentials before rotation. Do not push a claim of clean secrets. |
| Must Have before deployment | docker-compose.yml contains fixed database credentials, exposed ports and shared storage configurations. | Deferred to explicitly scoped container/environment hardening; no deployment authorized. |
| Should Have | client/test.rest:33 contains an expired account-bearing token. | Replace example credential and remove account-identifying example; do not assume expiration proves associated signing key safe. |
| Should Have | docs/jwt/JWT_DOCUMENTATION.md:53 contains a non-account sample token; guide repeats literal signing examples. | Replace with nonfunctional placeholders and accurate current contract guidance. Remaining legacy guide content is not part of the new API documentation. |
| Should Have | Server logs a module-type warning; client has seven lint/tooling warnings. | Deferred to dependency/runtime modernization; actual startup/build verified. |
| Should Have | API signup conflicts currently return generic errors; lists unpaginated; image checks are signature-only. | Explicitly documented limitations, not silent claims of full hardening. Product/media design remains to be validated. |
| Nice to Have | Existing commented-out route/config templates and legacy export/style noise. | Cleanup separately and proportionately. |
| Disagree | Thin controllers require a generic repository/service layer to qualify as Clean. | No current force justifies pass-through layers; pure rules and query adapters provide present seams. |

## Credential conclusion

No value is reproduced in this report. Current production credential usage cannot be established from repository files. Rotation needs a known service/configuration target and coordinated rollout, not an arbitrary generated replacement. No credentials rotated and no history rewritten. Earlier clean history scan does not override working-source findings.

## Commit boundaries

1. Server security, explicit configuration, runtime validators, queries, fast and database tests.
2. Client safe credential handling, API helper, consumer repairs and component tests.
3. Current API contracts and curated audit/verification reports. Exclude raw GitHub snapshots and execution inventories from commits.

Further step: approve concrete credential/example and ignored-local configuration remediation, then repeat secret checks before any push. Session/dependency/container/CI work remains separate. Historical contributor records and remote Project access not modified in this pass.
