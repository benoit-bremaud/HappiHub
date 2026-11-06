# OpenAPI 3.1 contract and route-drift test (#397)

A machine-readable OpenAPI 3.1 contract for every `/api` route and `/ready`, kept honest by a server test that fails when the Express routes and the contract diverge.

Status: validated by the owner on 2026-11-06 (D1 A, D2 A, D3 A); implemented. Work item: issue #397 (approach A of the issue,
hand-written contract + drift test, 415/500; D1–D3 below: 435, 455, 470).

## Scope

- In: `docs/api/openapi.yaml` describing the 35 routes of `server/routes/api.js` (prefix `/api`)
  plus `GET /ready`; request bodies, success and error responses, both error envelopes
  (`{message}` for brick D, `{message, code, details?}` for brick B), the cookie session + CSRF
  security scheme, `415`, `429` + `Retry-After`; the #333 correction (`PATCH /associations/:slug`
  answers `204`, verified in `associationController.js` before writing).
- In: one server unit test that (1) validates the contract as OpenAPI 3.1 and (2) compares the
  method + path pairs mounted by `createApp` with the contract operations.
- In: `API_DOCUMENTATION.md` stays the narrative guide, links to the contract and gets the 204 fix.
- Out: generating the contract from code, runtime request/response validation, interactive docs
  hosting, partner authentication (brick C), response-body conformance tests (follow-up issue).

No UML diagram: no behavior changes; the contract describes the existing component interface.

## Decision D1 — how the test enumerates routes

| Criterion (weight) | A walk the stack of `createApp` | B regex over `api.js` source | C walk `apiRoutes()` + constant `/ready` |
|---|---|---|---|
| Catches real drift, `/ready` and the `/api` mount included (35) | 5 — reads what the app actually serves | 2 — misses `app.js` routes and computed paths | 4 — `/ready` removal goes unseen |
| Simplicity (25) | 4 — reuses `sessionFixture.js`, ~30 lines | 4 | 5 |
| Robust to Express internals (20) | 4 — `layer.route.{path,methods}` is stable in Express 4 | 5 | 4 |
| Handles template paths (`${events}`) and arrays (20) | 4 | 2 | 3 |
| **Total /500** | **435** | 310 | 405 |

Sensitivity: simplicity 40 / drift 20 gives A 420 = C 420; any heavier weight on drift keeps A
first. **Chosen: A.** Express `:param` becomes `{param}`; the disabled legacy
`router.all(['/comments', '/comments/*'])` is mapped to the documented `/comments` (all methods,
503) through one explicit, commented exception so any other wildcard still fails.

## Decision D2 — how the contract is validated

| Criterion (weight) | A `@apidevtools/swagger-parser` in Jest | B Redocly CLI in a new CI step | C hand-written structural asserts |
|---|---|---|---|
| Real OpenAPI 3.1 schema validation (35) | 5 — validates 3.1 (Context7, 2026-11-06), resolves `$ref` | 4 | 1 |
| Local run equals CI, no workflow change (25) | 4 — runs inside `npm test` | 3 — CI/CD modification, new local command | 4 |
| Dependency cost (20) | 4 — one devDependency, parses YAML itself | 2 — CLI download per run | 5 |
| Maintainability (20) | 5 | 3 | 2 |
| **Total /500** | **455** | 315 | 275 |

Sensitivity: dependency cost 40 / validation 15 gives A 435 > C 355 > B 275. **Chosen: A**
(pinned devDependency, `npm ci --ignore-scripts` compatible).

## Decision D3 — file location

| Criterion (weight) | A `docs/api/openapi.yaml` | B `server/openapi.yaml` | C `docs/architecture/api/` |
|---|---|---|---|
| Discoverable by partner projects next to the guide (40) | 5 | 3 | 3 |
| Reachable by the server test (30) | 4 — `../docs/api` path | 5 | 4 |
| Fits the layout (`docs/` = published docs, `architecture/` = conception) (30) | 5 | 3 | 4 |
| **Total /500** | **470** | 360 | 360 |

Sensitivity: test proximity 60 gives A 440 > B 420. **Chosen: A.**

Totals recomputed by script.

## Acceptance criteria

1. `SwaggerParser.validate(docs/api/openapi.yaml)` passes and `openapi` is `3.1.0`.
2. The drift test lists the missing and the extra operations by name and fails when a route is
   added to or removed from `createApp` without a contract change (demonstrated by temporarily
   removing one route and one contract path: both fail).
3. Every operation documents its success status as the code returns it (`204` for
   `PATCH /associations/{slug}`), plus its error statuses and envelope.
4. `API_DOCUMENTATION.md` links to the contract; CHANGELOG, PROJECT_LOG, HANDOVER and WORK_PLAN updated.
