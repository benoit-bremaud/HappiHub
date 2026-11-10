# Local SonarQube quality control

`just gate` scans the pushed head of every PR on the self-hosted SonarQube Community Build and
waits for its quality gate (ADR-0005, #410). The former GitHub-artefact collector (`tools/quality/`,
2026-10-13 conception) was removed with the workflow it read; its history is in git.

## Current state

Project `happihub` / HappiHub is registered at <http://localhost:9000/dashboard?id=happihub>.
Main branch: `main`; new-code definition inherits **Previous version**. The default
Sonar way gate requires zero new issues, all new hotspots reviewed, >=80% new-code
coverage and <=3% duplication. Language profiles are inherited from the shared instance.
`sonar.projectVersion` remains 1.0.0 until the release policy deliberately changes it;
never use each commit SHA as a new version and reset the new-code window every push.

The scan reads `sonar-project.properties` (sources, tests, exclusions) and the three lcov reports
written by the tiers before it: `server/coverage/lcov.info` and `client/coverage/lcov.info`
(`just check`), `server/coverage/integration/lcov.info` (`just integration`). Operator entry
points covered through the jobs they call are excluded from coverage in the properties file.

## Running it

`just gate` (skill `local-ci`, tier L2) runs the scan after `just check` and `just integration`,
then the E2E suites and the image scans, and ends with the gate attestation. It needs:

- `sonar-scanner` on `PATH` (system tool, outside mise: the `sonar-scanner-npm` binary linked as
  `~/.local/bin/sonar-scanner`, skill `infra-accounts`);
- the instance answering on `http://localhost:9000`;
- the global analysis token of this machine in `~/.config/sonarqube/analysis-token` (mode 600), or
  `SONAR_TOKEN` exported. Agent shells do not inherit the shell export: the recipe reads the file.

The gate fails loudly when any of the three is missing; SonarQube is never skipped
(agents-skills #159). A standalone scan: `SONAR_TOKEN="$(cat ~/.config/sonarqube/analysis-token)"
sonar-scanner -Dsonar.qualitygate.wait=true` from the repository root, after the suites.

## Credentials — owner-controlled, never in chat

The global analysis token covers every local scan from this machine (skill `infra-accounts`
§ SonarQube tokens). The per-project token `project-happihub-collector-2026` and the fine-grained
GitHub token of the former collector (`~/.config/happihub-quality/`) have no reader left: revoke
them in SonarQube and GitHub, then delete the directory. Never paste token values into chat,
screenshots or issue bodies; record expirations privately and rotate before them.

SonarQube does not replace the manual Clean/SOLID review or the other checks of the gate
([CONTRIBUTING](../CONTRIBUTING.md) § Local CI — the four tiers).
