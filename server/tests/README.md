# Server tests

Two Jest suites, run from `server/`.

| Suite | Command | Files | Database |
| --- | --- | --- | --- |
| Fast (unit and HTTP boundary) | `npm test -- --runInBand` | `tests/*.test.js`, `tests/unit/` | none; bcrypt cost lowered by `fastBcrypt.js` |
| Integration | `npm run test:integration` | `tests/integration/` | disposable PostgreSQL container started by `globalSetup.js`, removed by `globalTeardown.js` (Docker required) |

- `unit/`: pure domain rules (`domain/`, `domain/event.js`) and the constant-SQL guard
  (`queryText.test.js`).
- Root files: session, CSRF, proxy boundary and configuration checks against the Express app
  with an in-memory session fixture (`sessionFixture.js`).
- `integration/`: accounts, associations, events (BC1–BC19 of the brick B specification),
  maintenance and migrations, through `harness.js` against a real database.

Coverage: add `--coverage`; the integration suite writes `coverage/integration/`. The
pre-merge SonarQube scan reads both lcov reports (see `docs/SONARQUBE.md`).

There is no end-to-end or performance suite yet. Never point the integration suite at a
real or shared database.
