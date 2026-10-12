# Dependency remediation — 2026-10-12

Owner approved manifest cleanup and reviewed same-major updates, with client tooling migration separate.

## Changes

Server production declarations reduced from 374 to eight: bcryptjs, body-parser, cors, dotenv-flow, express, joi, jsonwebtoken and mongoose. Seven development declarations retain Jest/Babel/Supertest/disposable MongoDB tooling. Removed native bcrypt and explicit transitive declarations not used by source/scripts.

Verified versions: Express 4.22.3, Mongoose 8.24.5, Joi 17.13.8, React Router DOM 6.30.6. Both lockfiles regenerated and compatible transitive fixes applied without force or major-range changes. Client declares prop-types directly, moves testing-library packages to devDependencies, and removes unused concurrently/dotenv declarations. React/build architecture unchanged.

## Verification

Clean npm ci succeeds for client and server with lifecycle scripts disabled. Fast server: 64 tests pass. Real MongoDB: 10 tests pass. Client: 16 tests pass. Client production build passes with remaining lint and CRA/Babel warnings. Diff check passes.

Final npm audit production server tree: zero findings. Full server tree: 33 affected entries (five moderate, 28 high, zero critical), with direct affected dependencies Jest and babel-jest. Full client tree: 104 affected entries (three low, 37 moderate, 64 high, zero critical); direct affected roots include react-scripts and a remaining moderate react-router-dom advisory. Counts include propagated chains and do not count independent reachable vulnerabilities. Aggregate count increased after compatible transitive refresh; no claim of fully clean dependencies.

A major Jest/toolchain migration and client build-tool migration require separate reviewed plans. No npm audit fix --force used. No CI or Docker changes.

## Local preview

Temporary launcher /tmp/happihub-preview.mjs starts a loopback MongoDB 7.0.40 process with synthetic fixtures, random signing key and API at localhost:5100. Client launched with HOST=127.0.0.1, PORT=3100 and REACT_APP_API_URL=http://localhost:5100/api. Existing service on port 3000 untouched.

Preview account: preview@example.com; password is synthetic and provided in chat, not a deployed credential. Browser snapshot confirms anonymous event list renders seeded event. API login and public reads return 200. Full interactive browser login/create journey not yet exercised. Existing Card image points to undefined when missing and displays raw metadata; UI cleanup is outside dependency scope.

No deployed database touched. MongoDB remains provisional for future conception review. No push or PR.
