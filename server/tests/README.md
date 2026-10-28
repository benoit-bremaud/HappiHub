# Server tests

Two Jest suites, run from `server/`.

| Suite | Command | Files | Database |
| --- | --- | --- | --- |
| Fast (unit and HTTP boundary) | `npm test -- --runInBand` | `tests/*.test.js`, `tests/unit/` | none; bcrypt cost lowered by `fastBcrypt.js` |
| Integration | `npm run test:integration` | `tests/integration/` | disposable PostgreSQL container started by `globalSetup.cjs`, removed by `globalTeardown.cjs` (Docker required) |

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

## Demo seed (#251)

`npm run seed:demo -- --confirm [--reset] [--rotate-passwords]` fills a local DEV database whose
name ends in `_demo` with the personas, associations and events of the
[test-environment spec](../../docs/architecture/specs/test-environment.md). Passwords are generated
into `server/.demo-credentials.local.json` (mode 0600, ignored by git; see
`.demo-credentials.example.json` for its shape). The seed is covered by `tests/unit/demoGuard.test.js`
and `tests/integration/seedDemo.test.js`; the rejection catalogue (§ 5) by
`tests/integration/rejectionCatalogue.test.js`.
