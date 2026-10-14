# Open-source quality follow-up — 2026-10-13

Status: owner accepted the direction; new configuration is not yet approved.
Work items: #25, #248; recovery PR #257, SonarQube PRs #258/#259.

## Accepted direction and delivery order

Use the existing local SonarQube Community Build as the main quality dashboard.
Complete its accepted collector integration first. Prepare a focused ESLint conception
next. reviewdog remains optional until inline findings offer a demonstrated benefit;
no additional paid review subscription or autonomous AI review service is required.
CodeRabbit availability is not an acceptance criterion. Historical statements that its
CLI was absent are evidence of the earlier review environment, not unfinished setup.
Manual design/code review remains necessary for business correctness and Clean/SOLID.

1. Publish/review the verified proxy-address correction on recovery PR #257 after owner
   authorization. The [correction design](specs/trusted-ingress-client-address.md) was
   approved October 13; 105 server tests and seven Docker scenarios pass locally.
2. Complete PR reviews and obtain explicit merge authorization. Recovery #257 must
   precede integration #259; conception #258 also needs acceptance. No merge is authorized
   by agreeing with the tooling direction.
3. Once dependencies reach main, update the integration branch as necessary and obtain
   passing hosted checks. Preserve the full test command; do not skip missing prerequisites.
4. Bind the real workflow ID, validate a foreground exact-SHA scan and its GitHub status,
   then obtain authorization to enable the local timer. No first analysis is claimed.
5. Complete the ESLint design after the urgent recovery concern. Treat the preliminary
   findings below as inputs, not a ready-to-implement configuration.

## Verified PR and local state

| Item | Evidence on October 13 | Consequence |
| --- | --- | --- |
| #257, dbf3b6 | One unresolved inline concern, verified exact: nginx.conf:8 appends the outer gateway, while Express trusts only Nginx | P1 Must Have before merge readiness |
| #258, 64b1679 | Draft, no reviews or check runs reported | Absence of checks is not CI success |
| #259, f74a84d | Draft, push and PR test jobs failed at missing server/jest.config.cjs | The needed file is in #257, absent from main |
| Timer | systemctl reports disabled and inactive | No automatic scanner activation |

[Review concern](https://github.com/benoit-bremaud/HappiHub/pull/257#discussion_r4251443252).
[Push failure](https://github.com/benoit-bremaud/HappiHub/actions/runs/38387350922).
[PR failure](https://github.com/benoit-bremaud/HappiHub/actions/runs/38387387147).
Existing app test/build success on the recovered source does not establish hosted CI
success for the separate integration branch. No new review comment was posted.

## ESLint study inputs — observed, not implementation approval

The recovered client already extends react-app and react-app/jest. Installed ESLint is
8.57.0 and eslint-config-react-app 7.0.1 requires ESLint ^8.0.0. Neither application package
has an explicit lint script. The backend mixes ES modules in .js, CommonJS Babel/Jest
configuration, and older TypeScript tests/validation; it is not uniformly CommonJS.

A read-only direct run of the existing client ESLint over src (.js/.jsx, including tests)
checked 20 files and returned exit 1: one error and two warnings:

- session.test.js:16 — testing-library/prefer-find-by (error).
- components/Card/Card.jsx:10 — jsx-a11y/img-redundant-alt (warning).
- components/Home/Home.jsx:10 — no-unused-vars (warning).

The tool also emitted the existing CRA undeclared Babel-plugin warning. No auto-fix,
installation, lockfile change, rules suppression or source change was performed.

Official version support, checked October 13, lists ESLint 8 and 9 as end-of-life,
with 10 current. ESLint 10 removes legacy eslintrc support. Therefore simply adding a
new latest ESLint next to the CRA preset is not a justified compatible implementation.
The initial suggestion to expose the existing linter is useful diagnostically but is
not a long-term maintained-toolchain recommendation.

Next conception must resolve:

- Supported engine/plugin/parser versions and Node compatibility, using pinned releases.
- Whether a maintained independent lint package is worth temporary overlap with CRA, or
  whether the planned CRA toolchain migration should own the transition. Avoid an automatic
  full build-system rewrite merely to add lint.
- Exact browser, Node, Jest and TypeScript scopes; generated/build/vendor exclusions;
  syntax lint versus type checking (do not claim one provides the other).
- Rules selected for concrete defects; existing findings and migration acceptance policy;
  no blanket warning suppression or arbitrary warning budget.
- Named-export rules for application code and explicit treatment of tool configuration
  exports that are mandated by third-party APIs.
- Same deterministic commands locally and in CI; read-only checks, no default --fix,
  no lint cache committed, no paid account or tokens required.
- Meaningful positive/negative configuration fixtures and tests for changed source.

Any CI/configuration implementation follows reviewed specification/UML and owner approval.
reviewdog and PR-Agent are deferred; no new bot or notification permission is implied.

## Sources

- [ESLint support policy](https://eslint.org/version-support/).
- [ESLint 10 migration](https://eslint.org/docs/latest/use/migrate-to-10.0.0).
- [SonarQube Community Build analysis](https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/analysis-overview).
- [reviewdog](https://github.com/reviewdog/reviewdog).

## Approval boundary

This local documentation branch is codex/quality-followup-conception, based on main.
It is separate from the dirty recovery checkout and contains documentation only. The
approved ingress correction is implemented locally on the recovery branch. No merge,
external review reply, pipeline change or timer activation was performed.
