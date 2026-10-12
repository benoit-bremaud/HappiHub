# HappiHub project instructions

## Required reading before work

1. [Current handover](docs/HANDOVER.md): state, approval boundaries and next actions.
2. [Prioritized work plan](docs/WORK_PLAN.md): product direction and dependencies.
3. [Project log](PROJECT_LOG.md): decisions and operational history.
4. The relevant approved specification/ADR and [current API contract](docs/API_DOCUMENTATION.md).

On the owner's machine, read `~/.agent-rules/common.md` when available; it contains
mandatory shared rules. Follow applicable session/global instructions. This file records
project-specific context and must remain useful in a checkout on another machine.

## Owner requirements specific to this project

- Keep the name HappiHub and the existing repository identity.
- Product purpose: culture, sharing and community through events. Current focus:
  organizer management, especially creation, editing and presentation.
- External website servers should use the backend API. Integration ownership,
  authorization and publication rules are still to be designed.
- **No code implementation without a complete detailed UML/specification study and
  Benoît's explicit validation of that conception.** This includes frontend, backend,
  demo/seed tooling, technical migrations and behavioral changes.
- Product ideas, roadmap choices and visual preferences do not authorize code.
- When an implementation exposes a design gap, update and revalidate the affected
  conception before continuing the affected code. Review requirements, traceability,
  Clean/SOLID, simplicity, pattern fit and security.
- Clément/Yazii's feedback is requested for the future visual design. Contacting another
  person requires explicit authorization; no design consultation has occurred yet.
- The logo, expanded fictional dataset and dedicated local test accounts remain pending.
- Explain and document work in English, including code comments and commit messages.
- New or touched modules use named exports; never introduce a TypeScript `any` type.
  New features require meaningful tests against the approved acceptance criteria.

## Repository and workflow facts

The application lives in client/ and server/, with separate npm lockfiles. There is no
root package.json or root build command. Architecture documentation lives under
`docs/architecture/`; accepted decisions are in decisions/, specifications in specs/,
UML sources in diagrams/. Current plan/status lives in docs/WORK_PLAN.md and HANDOVER.md.

Dedicated branches start from main. Existing unpublished recovery work is on
`fix/security-boundaries`: do not discard it or create a new feature implementation
before conception approval. Never commit directly to main. Use Conventional Commits.
Run appropriate checks before pushing; the human triggers the actual push. PR creation,
merge, deletion, force-push, external messages and CI/CD modification require explicit
owner authorization under the applicable project/session rules.

## Verified commands

From server/: `npm ci --ignore-scripts`, `npm test -- --runInBand`,
`npm run test:integration`, `npm start` (private runtime configuration and Mongo required).
From client/: `npm ci --ignore-scripts`, `CI=true npm test -- --watchAll=false --runInBand`,
`npm run build`, `npm start` (configure the public API URL).
There is no dedicated lint or typecheck npm script. Do not invent one or treat absence
as a successful check. See Docker/configuration docs for isolated local execution.

## Implementation and documentation pitfalls

- Current browser authentication uses HttpOnly sessions and CSRF, not bearer JWTs.
  Historical FAQ/GUIDE/tutorials do not define current API behavior.
- Role authorization and community ranks are distinct and their future model is unresolved.
- Event moderation pending/approved/rejected is not the proposed publication lifecycle.
- Current models use MongoDB/Mongoose; the final database decision remains open.
- Event titles currently have a unique index. Changing that needs conception and migration.
- Protected event identity comes from authenticated accounts, never caller-supplied author IDs.
- Do not expose owner/participant identifiers through public projections.
- Do not commit private environment files, real credentials, cookies or tokens.
- Existing previews may use temporary launchers absent from a fresh checkout. Verify live
  processes/ports instead of assuming an old handover guarantees they are running.
- Keep source/specification, dated evidence, current handover and release history distinct.
  Record substantive decisions in PROJECT_LOG.md, keep HANDOVER.md current, and put
  product changes under Unreleased until an actual release is authorized.
