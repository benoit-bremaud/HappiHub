# Folder architecture and anti-pattern follow-up — 2026-10-12

Status: read-only source audit and conception requirements. No files moved, application
code changed, tools installed or pipelines configured. Owner requested explicit folder,
Clean/SOLID, anti-pattern and duplication review; SonarQube configuration is deferred.
Reviewed recovery head 2a0e41c. This supplements the earlier quality audit and publication review.

## Current verdict

The client/server package split remains useful. The backend is organized by technical
roles (routes/controllers/models/validation/utils/config), and client components mix page,
feature and reusable presentation responsibilities in one directory. The folder names alone
neither prove nor disprove Clean compliance. Pure event-access and session-deadline helpers
are useful current boundaries; Mongo query translation depends on access rules.

No repository-wide Clean/SOLID or zero-duplication certification is warranted. No genuine
subtype hierarchy was found that calls for a Liskov-specific redesign. Review concrete
responsibilities/dependencies instead of inventing interfaces to satisfy a checklist.

## Concrete findings

| ID | Priority | Evidence | Finding / conception action |
| --- | --- | --- | --- |
| F1 | P1 Should Have | client/src/components/Connexion/connexion.css:1; Register/register.css:1 | Both files have 119 lines; normalized text similarity is 99.97% after stripping comments/whitespace. Duplicate global form selectors invite drift/cascade interference. Define canonical scoped form styles/tokens; extract reusable controls only when their contract is justified. This is a pairwise text measure, not repository duplication coverage. |
| F2 | P1 Should Have | client/src/components/Event/Event.jsx:14; EventInfo.jsx:15; Comment/Comment.jsx:17 | Three components repeat request/loading/error/AbortController lifecycle. Study focused feature hooks or a narrow shared request lifecycle where semantics match; retain resource/permission differences and no automatic write replay. |
| F3 | P1 Should Have | server/utils/access.js:1; utils/sessionPolicy.js:1; utils/jwt.js:1 | Generic utils mixes pure policy and retired infrastructure compatibility. Define explicit ownership and dependency boundaries; preserve the retirement decision and verify consumers before any deletion. |
| F4 | P1 Should Have | server/validation/eventValidation.js:2 | Unused Mongoose import creates an unnecessary persistence dependency in validation. Remove only through the accepted cleanup/conception increment; keep pure rules free of ORM/framework/IO imports. |
| F5 | P1 Should Have | server/controllers/eventController.js:13; commentController.js:15; userController.js:69 | HTTP handlers orchestrate persistence directly. Current small CRUD handlers can remain thin; the future website/integration flows need shared authoritative use cases where present complexity/reuse justifies them. Never duplicate event business rules between browser and external-API handlers. |
| F6 | P1 Should Have | server/jest.config.ts:9; jest.config.cjs:1; server/tests/README.md:1 | Active explicit Jest config coexists with stale unused configuration and a historical testing guide. Define one supported configuration, label current documentation, and remove unused files only with approval. JS/TS mix currently has no strict typecheck contract. |
| F7 | P1 Should Have | server/models/eventModel.js:12; models/commentModel.js:17; controllers/commentController.js:15 | Event.comments and Comment.event_id suggest two relationship authorities, but createComment writes only Comment. Decide the canonical relationship in the data conception; do not silently start maintaining a second collection/list or migrate old data. |
| F8 | P2 Should Have | client/src/components/Card/Card.jsx:15; config/mongo.js:7; models/eventModel.js:24 | Card still references an excluded creator field; startup adapter reads environment internally; legacy files still use default exports. Define presentation contracts and composition-boundary configuration; convert exports when the approved increment touches modules. No project-wide cosmetic rewrite. |

Import scan: 57 local JS/JSX/TS/CJS source/config/test files, 101 resolved relative-import
edges, zero detected cycles. The scan resolves literal local paths; it is not a full parser,
package dependency analyzer, dynamic-runtime analysis or exhaustive architectural proof.

## Target conception and folder responsibilities

Preserve separate client and server packages until a real requirement justifies changing
them. The complete conception must name each selected module/file and its responsibility,
consumers and permitted dependencies, with an existing-to-target path migration table.

| Responsibility | Candidate placement to evaluate | Dependency rule |
| --- | --- | --- |
| Pure event/account/security rules and invariants | Explicit backend domain modules replacing catch-all policy utils where justified | No Express, React, Mongoose, environment reads or network/file IO |
| Selected shared workflow orchestration | Backend application/use-case modules only for approved scenarios that need them | Calls domain rules and narrow justified IO contracts; reusable by website and integration adapters |
| HTTP translation and database implementation | Existing routes/controllers and models/queries, or explicit adapters when their seam is justified | Translate transport/storage concerns; depend inward on selected domain/use-case contracts |
| Runtime wiring and configuration | Existing app/server/config composition boundary | Constructs concrete dependencies and resolves private configuration |
| Browser routing/session composition | Client app entry modules | Wires selected features and API/session infrastructure |
| Organizer, event and account UI workflows | Client feature folders with focused pages/hooks/adapters | Keeps domain decisions server-authoritative; separates workflow IO from presentation where complexity warrants it |
| Proven reusable controls/styles/tokens | Small shared client UI/theme modules | No feature-specific ownership rules, speculative generic form engine or duplicate style authority |
| Tests and architecture documentation | Tests aligned with behavior/boundaries; docs/architecture specs, decisions and diagrams | Explicit mapping from accepted requirements to verification and source modules |

These are responsibilities/candidates, not an approved directory tree. Only create boundaries
with a present testability, reuse, variability or complexity force. No empty services,
repositories with pass-through methods, interfaces for hypothetical providers, god modules,
circular imports, duplicated authoritative rules or framework-dependent domain logic.

Before restructuring: complete component/dependency UML, selected domain/use-case contracts,
responsibility/path map, migration/import changes, package/export/configuration effects,
regression plan and four-pass review. Obtain explicit owner approval of the exact package.
Use separate conception documentation review before implementation. No blanket renaming.

## Quality tooling — later study, no installation

| Candidate | Purpose / limit | Tracking |
| --- | --- | --- |
| SonarQube | Reliability/security/maintainability findings, duplication and quality gate; consumes test-produced coverage. Define project scope, exclusions, coverage paths, new-code baseline, service edition/access and credentials privately. It does not establish architectural compliance by itself. | #25, #248 |
| ESLint | Deterministic unused import, export and selected complexity rules. CRA already supplies a client lint configuration; any standalone/modern setup must match the approved toolchain. | #248 |
| dependency-cruiser | Validate actual module graph against approved forbidden dependencies and cycles. Rules must come from conception, not arbitrary folder names. | #41, #248 |
| jscpd | Optional targeted clone detection where Sonar's supported scope leaves gaps; define production/test/generated exclusions and review whether similarities really encode shared knowledge. Avoid redundant mandatory tooling. | #248 |
| Existing tests and security checks | Behavioral tests plus existing Gitleaks/audit and designed CodeQL/dependency/image checks complement quality analysis. Coverage percentage does not judge test quality or prove security. | #17, #18, #19, #25, #55 |

Evaluate the smallest useful set after scope/toolchain decisions. Manual semantic architecture,
SOLID, anti-pattern and test-quality review remains required. No scanner results are claimed.

Primary tooling references checked on 2026-10-12:
[Sonar quality gates](https://docs.sonarsource.com/sonarqube-server/2025.1/instance-administration/analysis-functions/quality-gates),
[Sonar coverage reporting](https://www.sonarsource.com/blog/how-sonarqube-coverage-reporting-works/),
[ESLint configuration](https://eslint.org/docs/latest/use/configure/configuration-files),
[dependency-cruiser rules](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md),
[jscpd project](https://github.com/kucherenko/jscpd).
