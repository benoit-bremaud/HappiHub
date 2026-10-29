# Repository audit leftovers (#295)

Mini-specification for removing the code, configuration and CI leftovers found by the
2026-10-19 repository audit, without changing any product behavior.

Status: validated by the owner on 2026-10-28 (option A, CI change authorized). Issue: #295. Follow-up: #307 (branch coverage).

## Scope

No user-visible behavior, API contract, database schema or runtime configuration changes.
No UML diagram is affected: the change touches tooling, examples and dead code only.

| ID | Change | Verified fact (2026-10-28) |
|---|---|---|
| R1 | CI server coverage: drop the command-line globs so the `collectCoverageFrom` scope of `jest.config.cjs` applies (all server modules, operator entry points excluded; amended during review-local to keep one source of truth) | `.github/workflows/quality-tests.yml` lists absent `models`, `queries`, `validation` and omits `db`, `domain`, `jobs`, `services` |
| R2 | `client/.env.example`: keep only `REACT_APP_API_URL` | `client/src/api.js` is the only `process.env` reader; the file advertises an OAuth client secret and API secret that CRA would bundle |
| R3 | `server/.env.example`: document `NODE_ENV` (values `production`/`test`/other), `TEST_DATABASE_URL` and the `*_FILE` variants read at startup | `config/appConfig.js`, `config/fieldKeyring.js`, `server.js`, `jobs/migrate.js`, integration `globalSetup.cjs` |
| R4 | Delete `client/test.rest`, `client/public/assets/images/pic.jpg`, `client/public/assets/videos/vid.mp4` | no reference outside package files and archived docs |
| R5 | Remove unused dependencies `body-parser` (server), `@babel/preset-typescript` and its babel comment (server), `@testing-library/user-event` (client); regenerate lockfiles with `npm uninstall` | no import in source or tests |
| R6 | `server/package.json`: add `"type": "module"`; rename the CommonJS files `babel.config.js` → `.cjs`, `tests/integration/globalSetup.js` and `globalTeardown.js` → `.cjs` and update `jest.integration.cjs` | `npm start` currently relies on Node syntax detection (ESM sources without `type`) |
| R7 | `client/src/reportWebVitals.js`: named export, updated import in `index.js` | owner rule: named exports only |
| R8 | Drop `export` from symbols used only in their own file: `POSTER_STYLES`, `PRICE_KINDS`, `REQUIRED_FIELDS`, `parseFields`, `checkConsistency`, `missingFields` (`domain/event.js`), `MAX_ASSOCIATIONS_CREATED` (`domain/rules.js`), `toAccount` (`services/accounts.js`), `sessionDeadline` (`utils/sessionPolicy.js`) | repository-wide word search, excluding `node_modules` and `coverage` |

## Acceptance criteria

1. Server unit and integration suites, client suite and client build pass locally and in CI.
2. The CI coverage report includes files from `db/`, `domain/`, `jobs/` and `services/`;
   the new baseline numbers are recorded in `PROJECT_LOG.md` and on #307.
3. `npm start`, `npm run migrate` and `npm run seed:demo` start without the Node
   "module type not specified" warning.
4. `git grep` finds no reference to the deleted files, dependencies or removed exports.
5. No new or changed test is required beyond the existing suites (pure removal/config);
   AC 2–4 are checked manually and reported in the PR.

## Risks and mitigations

- R1 can lower the reported coverage: expected and accepted; raising it is #307. The CI has
  no coverage threshold, so the job stays green.
- R6 can break a CommonJS file missed by the search: three `require` users found; the full
  suites and the three `npm` entry scripts are run before push.
- R1 modifies a CI/CD workflow: explicit owner authorization requested with this spec.
