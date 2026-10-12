# Roadmap backlog reconciliation — 2026-10-12

Status: executed and verified against fresh GitHub issue and active Project inventories.

The owner authorized updating issues and Project, closing superseded tasks, and publishing
the existing recovery branch with Clement review. No feature implementation is authorized.

Scope: 121 open issues inventoried; every issue is accounted for below. Original bodies
and discussions remain accessible. Superseded issues are closed as not_planned and their
Project cards archived. This does not assert completion or reject all historical ideas.

Verified outcome: 24 retained design/quality workstreams, 14 restoration items In review,
83 superseded issues closed/archived, 15 new issues. Final open total: 53.
Project priorities P0–P3 follow docs/WORK_PLAN.md. Obsolete Project estimates/sizes/dates
are cleared where present; no new deadlines are invented. Historical milestone assignments
are removed from reframed design epics and preserved on restoration items where applicable.

## New work

| Issue | Priority | Scope |
| --- | --- | --- |
| [#242](https://github.com/benoit-bremaud/HappiHub/issues/242) | P0 | research(product): establish feature evidence and first-release priorities |
| [#243](https://github.com/benoit-bremaud/HappiHub/issues/243) | P0 | design(domain): define event ownership and collaboration boundaries |
| [#244](https://github.com/benoit-bremaud/HappiHub/issues/244) | P0 | design(api): specify server-to-server event integration |
| [#245](https://github.com/benoit-bremaud/HappiHub/issues/245) | P0 | design(editor): specify event creation, editing and publication lifecycle |
| [#246](https://github.com/benoit-bremaud/HappiHub/issues/246) | P0 | design(data): compare persistence options and record database decision |
| [#247](https://github.com/benoit-bremaud/HappiHub/issues/247) | P0 | review(conception): validate complete UML and requirement traceability |
| [#248](https://github.com/benoit-bremaud/HappiHub/issues/248) | P1 | design(tooling): remediate remaining CRA and test dependency risks |
| [#249](https://github.com/benoit-bremaud/HappiHub/issues/249) | P1 | design(ux): define organizer journeys and review visuals with Clement |
| [#250](https://github.com/benoit-bremaud/HappiHub/issues/250) | P1 | design(identity): explore an original fun HappiHub logo |
| [#251](https://github.com/benoit-bremaud/HappiHub/issues/251) | P1 | design(demo): specify reproducible local events and test accounts |
| [#252](https://github.com/benoit-bremaud/HappiHub/issues/252) | P1 | feat(events): implement the approved first complete event workflow |
| [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) | P2 | design(community): consolidate comments and moderation requirements |
| [#254](https://github.com/benoit-bremaud/HappiHub/issues/254) | P2 | research(ai): evaluate optional event copy and image assistance |
| [#255](https://github.com/benoit-bremaud/HappiHub/issues/255) | P2 | design(events): study templates, duplication and recurring series |
| [#256](https://github.com/benoit-bremaud/HappiHub/issues/256) | P1 | chore(recovery): review and accept HappiHub restoration baseline |

## Existing issue dispositions

| Issue | Disposition | Replacement / current rationale |
| --- | --- | --- |
| [#8](https://github.com/benoit-bremaud/HappiHub/issues/8) | Keep / In review | PATCH /api/events/:id uses authenticated identity, approved/public visibility or owner access, atomic addToSet and privacy-safe projection. |
| [#17](https://github.com/benoit-bremaud/HappiHub/issues/17) | Keep / Backlog | test(api): maintain risk-based backend regression coverage |
| [#18](https://github.com/benoit-bremaud/HappiHub/issues/18) | Keep / Backlog | test(integration): verify persistence and API contracts |
| [#19](https://github.com/benoit-bremaud/HappiHub/issues/19) | Keep / Backlog | test(ui): verify critical browser workflows and accessibility |
| [#20](https://github.com/benoit-bremaud/HappiHub/issues/20) | Keep / Backlog | test(acceptance): validate organizer and integrator scenarios |
| [#21](https://github.com/benoit-bremaud/HappiHub/issues/21) | Keep / Backlog | design(operations): prepare deployment, backup and recovery acceptance |
| [#22](https://github.com/benoit-bremaud/HappiHub/issues/22) | Close not_planned / archive | [#21](https://github.com/benoit-bremaud/HappiHub/issues/21) — Deployment tasks consolidated; TLS belongs to the selected gateway topology, not an assumed Express certificate feature. |
| [#23](https://github.com/benoit-bremaud/HappiHub/issues/23) | Close not_planned / archive | [#21](https://github.com/benoit-bremaud/HappiHub/issues/21) — Deployment tasks consolidated; TLS belongs to the selected gateway topology, not an assumed Express certificate feature. |
| [#24](https://github.com/benoit-bremaud/HappiHub/issues/24) | Close not_planned / archive | [#21](https://github.com/benoit-bremaud/HappiHub/issues/21) — Deployment tasks consolidated; TLS belongs to the selected gateway topology, not an assumed Express certificate feature. |
| [#25](https://github.com/benoit-bremaud/HappiHub/issues/25) | Keep / Backlog | design(ci): define security and quality pipeline baseline |
| [#26](https://github.com/benoit-bremaud/HappiHub/issues/26) | Close not_planned / archive | [#21](https://github.com/benoit-bremaud/HappiHub/issues/21) — Deployment tasks consolidated; TLS belongs to the selected gateway topology, not an assumed Express certificate feature. |
| [#38](https://github.com/benoit-bremaud/HappiHub/issues/38) | Close not_planned / archive | [#21](https://github.com/benoit-bremaud/HappiHub/issues/21) — Deployment tasks consolidated; TLS belongs to the selected gateway topology, not an assumed Express certificate feature. |
| [#39](https://github.com/benoit-bremaud/HappiHub/issues/39) | Close not_planned / archive | [#57](https://github.com/benoit-bremaud/HappiHub/issues/57) — Documentation requirements consolidated under current authoritative guides. |
| [#41](https://github.com/benoit-bremaud/HappiHub/issues/41) | Keep / Backlog | design(uml): produce the authoritative HappiHub conception package |
| [#42](https://github.com/benoit-bremaud/HappiHub/issues/42) | Close not_planned / archive | [#57](https://github.com/benoit-bremaud/HappiHub/issues/57) — Documentation requirements consolidated under current authoritative guides. |
| [#43](https://github.com/benoit-bremaud/HappiHub/issues/43) | Close not_planned / archive | [#41](https://github.com/benoit-bremaud/HappiHub/issues/41) — Conception and justified architecture review replace generic UML-guide/refactoring tasks. |
| [#45](https://github.com/benoit-bremaud/HappiHub/issues/45) | Close not_planned / archive | [#215](https://github.com/benoit-bremaud/HappiHub/issues/215) — Contributor workflow consolidated; a Makefile remains optional, not a prerequisite. |
| [#46](https://github.com/benoit-bremaud/HappiHub/issues/46) | Close not_planned / archive | [#57](https://github.com/benoit-bremaud/HappiHub/issues/57) — Documentation requirements consolidated under current authoritative guides. |
| [#47](https://github.com/benoit-bremaud/HappiHub/issues/47) | Close not_planned / archive | [#215](https://github.com/benoit-bremaud/HappiHub/issues/215) — Contributor workflow consolidated; a Makefile remains optional, not a prerequisite. |
| [#48](https://github.com/benoit-bremaud/HappiHub/issues/48) | Close not_planned / archive | [#215](https://github.com/benoit-bremaud/HappiHub/issues/215) — Contributor workflow consolidated; a Makefile remains optional, not a prerequisite. |
| [#49](https://github.com/benoit-bremaud/HappiHub/issues/49) | Close not_planned / archive | [#53](https://github.com/benoit-bremaud/HappiHub/issues/53) — Performance work requires measured targets and one reproducible study. |
| [#50](https://github.com/benoit-bremaud/HappiHub/issues/50) | Close not_planned / archive | [#17](https://github.com/benoit-bremaud/HappiHub/issues/17) — Testing requirements retained in risk-based coverage; not claimed completely implemented. |
| [#51](https://github.com/benoit-bremaud/HappiHub/issues/51) | Close not_planned / archive | [#215](https://github.com/benoit-bremaud/HappiHub/issues/215) — Contributor workflow consolidated; a Makefile remains optional, not a prerequisite. |
| [#52](https://github.com/benoit-bremaud/HappiHub/issues/52) | Close not_planned / archive | [#41](https://github.com/benoit-bremaud/HappiHub/issues/41) — Conception and justified architecture review replace generic UML-guide/refactoring tasks. |
| [#53](https://github.com/benoit-bremaud/HappiHub/issues/53) | Keep / Backlog | research(performance): establish measured performance and load targets |
| [#54](https://github.com/benoit-bremaud/HappiHub/issues/54) | Close not_planned / archive | [#17](https://github.com/benoit-bremaud/HappiHub/issues/17) — Testing requirements retained in risk-based coverage; not claimed completely implemented. |
| [#55](https://github.com/benoit-bremaud/HappiHub/issues/55) | Keep / Backlog | security: maintain application and privacy readiness |
| [#56](https://github.com/benoit-bremaud/HappiHub/issues/56) | Keep / Backlog | design(accessibility): define and validate accessible critical journeys |
| [#57](https://github.com/benoit-bremaud/HappiHub/issues/57) | Keep / Backlog | docs: maintain verified contracts and contributor continuity |
| [#58](https://github.com/benoit-bremaud/HappiHub/issues/58) | Keep / Backlog | research(product): complete HappiHub purpose and organizer framing |
| [#59](https://github.com/benoit-bremaud/HappiHub/issues/59) | Close not_planned / archive | [#25](https://github.com/benoit-bremaud/HappiHub/issues/25) — CI and deployment automation require one designed pipeline and explicit approval. |
| [#60](https://github.com/benoit-bremaud/HappiHub/issues/60) | Keep / Backlog | design(i18n): assess multilingual event and interface requirements |
| [#61](https://github.com/benoit-bremaud/HappiHub/issues/61) | Keep / Backlog | design(analytics): define privacy-conscious product usage evidence |
| [#62](https://github.com/benoit-bremaud/HappiHub/issues/62) | Keep / Backlog | design(media): specify safe event images and content presentation |
| [#65](https://github.com/benoit-bremaud/HappiHub/issues/65) | Keep / Backlog | security(governance): verify main protection and merge policy |
| [#82](https://github.com/benoit-bremaud/HappiHub/issues/82) | Close not_planned / archive | [#256](https://github.com/benoit-bremaud/HappiHub/issues/256) — JWT blacklist superseded by durable revocable cookie sessions, not implemented as a blacklist. |
| [#87](https://github.com/benoit-bremaud/HappiHub/issues/87) | Keep / Backlog | design(accounts): define profiles, account lifecycle and community ranks |
| [#93](https://github.com/benoit-bremaud/HappiHub/issues/93) | Close not_planned / archive | [#87](https://github.com/benoit-bremaud/HappiHub/issues/87) — Account/rank/role requirements need one privacy and authorization conception. |
| [#94](https://github.com/benoit-bremaud/HappiHub/issues/94) | Close not_planned / archive | [#87](https://github.com/benoit-bremaud/HappiHub/issues/87) — Account/rank/role requirements need one privacy and authorization conception. |
| [#95](https://github.com/benoit-bremaud/HappiHub/issues/95) | Close not_planned / archive | [#87](https://github.com/benoit-bremaud/HappiHub/issues/87) — Account/rank/role requirements need one privacy and authorization conception. |
| [#97](https://github.com/benoit-bremaud/HappiHub/issues/97) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#98](https://github.com/benoit-bremaud/HappiHub/issues/98) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#99](https://github.com/benoit-bremaud/HappiHub/issues/99) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#100](https://github.com/benoit-bremaud/HappiHub/issues/100) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#101](https://github.com/benoit-bremaud/HappiHub/issues/101) | Close not_planned / archive | [#87](https://github.com/benoit-bremaud/HappiHub/issues/87) — Account/rank/role requirements need one privacy and authorization conception. |
| [#102](https://github.com/benoit-bremaud/HappiHub/issues/102) | Close not_planned / archive | [#245](https://github.com/benoit-bremaud/HappiHub/issues/245) — Generic event suggestions retained across editor, discovery, participation, communication and recurring-event studies. |
| [#103](https://github.com/benoit-bremaud/HappiHub/issues/103) | Close not_planned / archive | [#87](https://github.com/benoit-bremaud/HappiHub/issues/87) — Account/rank/role requirements need one privacy and authorization conception. |
| [#104](https://github.com/benoit-bremaud/HappiHub/issues/104) | Close not_planned / archive | [#87](https://github.com/benoit-bremaud/HappiHub/issues/87) — Account/rank/role requirements need one privacy and authorization conception. |
| [#105](https://github.com/benoit-bremaud/HappiHub/issues/105) | Close not_planned / archive | [#87](https://github.com/benoit-bremaud/HappiHub/issues/87) — Account/rank/role requirements need one privacy and authorization conception. |
| [#106](https://github.com/benoit-bremaud/HappiHub/issues/106) | Close not_planned / archive | [#87](https://github.com/benoit-bremaud/HappiHub/issues/87) — Account/rank/role requirements need one privacy and authorization conception. |
| [#113](https://github.com/benoit-bremaud/HappiHub/issues/113) | Close not_planned / archive | [#17](https://github.com/benoit-bremaud/HappiHub/issues/17) — Testing requirements retained in risk-based coverage; not claimed completely implemented. |
| [#114](https://github.com/benoit-bremaud/HappiHub/issues/114) | Keep / Backlog | design(events): define concurrent editing and change history |
| [#115](https://github.com/benoit-bremaud/HappiHub/issues/115) | Keep / In review | Current docs describe GET /api/events/:id, public/owner boundaries, response shape and controlled errors. |
| [#119](https://github.com/benoit-bremaud/HappiHub/issues/119) | Close not_planned / archive | [#87](https://github.com/benoit-bremaud/HappiHub/issues/87) — Account/rank/role requirements need one privacy and authorization conception. |
| [#122](https://github.com/benoit-bremaud/HappiHub/issues/122) | Close not_planned / archive | [#87](https://github.com/benoit-bremaud/HappiHub/issues/87) — Account/rank/role requirements need one privacy and authorization conception. |
| [#124](https://github.com/benoit-bremaud/HappiHub/issues/124) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#126](https://github.com/benoit-bremaud/HappiHub/issues/126) | Keep / Backlog | design(discovery): define event taxonomy and discovery needs |
| [#127](https://github.com/benoit-bremaud/HappiHub/issues/127) | Keep / Backlog | design(ticketing): assess payments and ticket lifecycle |
| [#128](https://github.com/benoit-bremaud/HappiHub/issues/128) | Keep / Backlog | design(communications): define event updates and reminders |
| [#129](https://github.com/benoit-bremaud/HappiHub/issues/129) | Keep / Backlog | design(participation): define registration, capacity and attendance |
| [#139](https://github.com/benoit-bremaud/HappiHub/issues/139) | Close not_planned / archive | [#57](https://github.com/benoit-bremaud/HappiHub/issues/57) — Documentation requirements consolidated under current authoritative guides. |
| [#140](https://github.com/benoit-bremaud/HappiHub/issues/140) | Close not_planned / archive | [#57](https://github.com/benoit-bremaud/HappiHub/issues/57) — Documentation requirements consolidated under current authoritative guides. |
| [#141](https://github.com/benoit-bremaud/HappiHub/issues/141) | Close not_planned / archive | [#57](https://github.com/benoit-bremaud/HappiHub/issues/57) — Documentation requirements consolidated under current authoritative guides. |
| [#142](https://github.com/benoit-bremaud/HappiHub/issues/142) | Close not_planned / archive | [#57](https://github.com/benoit-bremaud/HappiHub/issues/57) — Documentation requirements consolidated under current authoritative guides. |
| [#155](https://github.com/benoit-bremaud/HappiHub/issues/155) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#156](https://github.com/benoit-bremaud/HappiHub/issues/156) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#157](https://github.com/benoit-bremaud/HappiHub/issues/157) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#158](https://github.com/benoit-bremaud/HappiHub/issues/158) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#159](https://github.com/benoit-bremaud/HappiHub/issues/159) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#160](https://github.com/benoit-bremaud/HappiHub/issues/160) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#161](https://github.com/benoit-bremaud/HappiHub/issues/161) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#162](https://github.com/benoit-bremaud/HappiHub/issues/162) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#163](https://github.com/benoit-bremaud/HappiHub/issues/163) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#164](https://github.com/benoit-bremaud/HappiHub/issues/164) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#165](https://github.com/benoit-bremaud/HappiHub/issues/165) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#167](https://github.com/benoit-bremaud/HappiHub/issues/167) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#168](https://github.com/benoit-bremaud/HappiHub/issues/168) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#169](https://github.com/benoit-bremaud/HappiHub/issues/169) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#170](https://github.com/benoit-bremaud/HappiHub/issues/170) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#171](https://github.com/benoit-bremaud/HappiHub/issues/171) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#175](https://github.com/benoit-bremaud/HappiHub/issues/175) | Close not_planned / archive | [#18](https://github.com/benoit-bremaud/HappiHub/issues/18) — Isolated test databases replace backup-in-Git assumptions; integration work consolidated. |
| [#176](https://github.com/benoit-bremaud/HappiHub/issues/176) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#178](https://github.com/benoit-bremaud/HappiHub/issues/178) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#179](https://github.com/benoit-bremaud/HappiHub/issues/179) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#180](https://github.com/benoit-bremaud/HappiHub/issues/180) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#181](https://github.com/benoit-bremaud/HappiHub/issues/181) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#184](https://github.com/benoit-bremaud/HappiHub/issues/184) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#185](https://github.com/benoit-bremaud/HappiHub/issues/185) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#186](https://github.com/benoit-bremaud/HappiHub/issues/186) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#190](https://github.com/benoit-bremaud/HappiHub/issues/190) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#191](https://github.com/benoit-bremaud/HappiHub/issues/191) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#192](https://github.com/benoit-bremaud/HappiHub/issues/192) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#194](https://github.com/benoit-bremaud/HappiHub/issues/194) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#195](https://github.com/benoit-bremaud/HappiHub/issues/195) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#197](https://github.com/benoit-bremaud/HappiHub/issues/197) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#198](https://github.com/benoit-bremaud/HappiHub/issues/198) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#201](https://github.com/benoit-bremaud/HappiHub/issues/201) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#202](https://github.com/benoit-bremaud/HappiHub/issues/202) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#203](https://github.com/benoit-bremaud/HappiHub/issues/203) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#205](https://github.com/benoit-bremaud/HappiHub/issues/205) | Close not_planned / archive | [#244](https://github.com/benoit-bremaud/HappiHub/issues/244) — API documentation synchronization is part of authoritative contract conception; no separate speculative Postman synchronizer. |
| [#206](https://github.com/benoit-bremaud/HappiHub/issues/206) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#207](https://github.com/benoit-bremaud/HappiHub/issues/207) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#208](https://github.com/benoit-bremaud/HappiHub/issues/208) | Close not_planned / archive | [#253](https://github.com/benoit-bremaud/HappiHub/issues/253) — Comment routes/tests/docs consolidated into a single moderation conception; proposed routes and original response assumptions are not claimed implemented. |
| [#215](https://github.com/benoit-bremaud/HappiHub/issues/215) | Keep / Backlog | docs(contributing): establish current contributor and review guide |
| [#218](https://github.com/benoit-bremaud/HappiHub/issues/218) | Keep / In review | CommonJS Jest configuration supports JS and legacy TypeScript validators; fast and isolated integration suites pass. |
| [#219](https://github.com/benoit-bremaud/HappiHub/issues/219) | Keep / In review | Tests cover signup hashing, ordinary-role enforcement and real database unique-email behavior; broader cases remain in #17. |
| [#220](https://github.com/benoit-bremaud/HappiHub/issues/220) | Keep / In review | Tests cover awaited bcrypt verification, invalid credentials and revocable cookie-session login, replacing JWT expectations. |
| [#221](https://github.com/benoit-bremaud/HappiHub/issues/221) | Close not_planned / archive | [#17](https://github.com/benoit-bremaud/HappiHub/issues/17) — Testing requirements retained in risk-based coverage; not claimed completely implemented. |
| [#226](https://github.com/benoit-bremaud/HappiHub/issues/226) | Keep / In review | Real hashing and positive/negative password comparisons are exercised by security and integration tests. |
| [#227](https://github.com/benoit-bremaud/HappiHub/issues/227) | Keep / In review | Isolated MongoDB integration verifies signup persistence contains a bcrypt hash, never the submitted cleartext password. |
| [#228](https://github.com/benoit-bremaud/HappiHub/issues/228) | Close not_planned / archive | [#17](https://github.com/benoit-bremaud/HappiHub/issues/17) — Testing requirements retained in risk-based coverage; not claimed completely implemented. |
| [#229](https://github.com/benoit-bremaud/HappiHub/issues/229) | Close not_planned / archive | [#53](https://github.com/benoit-bremaud/HappiHub/issues/53) — Performance work requires measured targets and one reproducible study. |
| [#231](https://github.com/benoit-bremaud/HappiHub/issues/231) | Keep / Backlog | design(observability): specify privacy-safe logs and monitoring |
| [#232](https://github.com/benoit-bremaud/HappiHub/issues/232) | Close not_planned / archive | [#21](https://github.com/benoit-bremaud/HappiHub/issues/21) — Deployment tasks consolidated; TLS belongs to the selected gateway topology, not an assumed Express certificate feature. |
| [#235](https://github.com/benoit-bremaud/HappiHub/issues/235) | Keep / In review | Injected validated runtime config, private local configuration and file-based production secrets are documented; no real secret committed in new state. |
| [#236](https://github.com/benoit-bremaud/HappiHub/issues/236) | Keep / In review | Wrong passwords return failure and no authenticated session; valid login still succeeds. |
| [#237](https://github.com/benoit-bremaud/HappiHub/issues/237) | Keep / In review | Server assigns ordinary role; malicious role selection is rejected or cannot confer privilege. |
| [#238](https://github.com/benoit-bremaud/HappiHub/issues/238) | Keep / In review | Anonymous reads expose approved nonprivate events only; authenticated owners can read their restricted events; cross-account access is denied without leaking existence. |
| [#239](https://github.com/benoit-bremaud/HappiHub/issues/239) | Keep / In review | Event/comment authors come from authenticated identity; forged author input cannot choose another owner. |
| [#240](https://github.com/benoit-bremaud/HappiHub/issues/240) | Keep / In review | Profile responses are allowlisted and auth handlers do not log full user documents/password hashes. |
| [#241](https://github.com/benoit-bremaud/HappiHub/issues/241) | Keep / In review | Missing/invalid cookie sessions fail safely; legacy bearer tokens confer no authority; event creation no longer decodes an absent browser JWT. |

## Interpretation and limits

- JWT blacklist #82 is superseded by cookie-session revocation, not fulfilled literally.
- Comment route, documentation and test assumptions are preserved under #253; no unused route is asserted to exist.
- Broad testing epics remain open; passing current suites is not exhaustive validation.
- Remaining media, dependency, privacy and CI work remains tracked, not declared fixed.
- MongoDB remains provisional until #246 records the approved persistence decision.
- Implementation #252 is blocked by reviewed conception and explicit owner approval #247.
- Recovery review #256 is separate from product scope approval and production launch.
- Raw GitHub inventories and temporary execution scripts remain private working evidence and are excluded from commits.

## Final verification

- 53 open issues and 53 active Project cards; no missing or extraneous issue cards.
- 38 Backlog and 15 In review (14 existing restoration items plus #256 delivery).
- Priority distribution: 8 P0, 33 P1, 11 P2, 1 P3.
- All 83 selected closures verified closed/not_planned; archive mutations succeeded.
- Obsolete start/end dates absent from active cards; no replacement dates invented.
- Open issue assignees remain limited to Benoit and Clement.
- None of the reviewed restoration issues is marked Done before the recovery PR is accepted.
