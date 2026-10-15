# HappiHub V1 — product framing

Status: validated by the owner on 2026-10-15 (conception workshop 1). This document fixes
the V1 scope that the UML conception (#41) must satisfy. It does not authorize code.
Refs #58, #242, #243, #245.

## Guiding principle

Keep V1 relatively simple. Anything more complex is deferred to later versions. Effort
goes into a beautiful, simple, easy-to-learn site where creating an event feels easy and
playful. The UI/UX is designed from the user journey first.

## Positioning

HappiHub V1 lets **cultural associations** create, present and publish their events once,
**on HappiHub and on their own website** through a read API keyed per organizer. The public
browses freely without an account.

| Decision | V1 choice | Rationale (weighted analysis in workshop 1) |
| --- | --- | --- |
| Primary organizer | Cultural associations | Best fit with the culture/sharing/community purpose; under-served by editorial tools (score 4.3) |
| Core value | Create and present (foundation) + publish everywhere (differentiator) | Matches the confirmed editor and API directions (4.1 / 4.3) |
| External consumers | The organizers' own websites | Simplest authorization: revocable keys scoped to the association, own published events only (4.8); key management detailed and superseded by J6 D2 (several named keys, at most 5) |
| Participant account | None required; public read-only pages | Minimal personal data and moderation; best sharing/SEO (4.6) |
| Event managers | An association owns its events; several invited members, all with the same rights | Supports volunteer teams without a role model |
| Event lifecycle | Draft → Published → Cancelled / Archived | Direct publication by the association; no prior moderation; reporting possible |

## Platform administration

Validated 2026-10-15 (score 4.7, against moderator without suspension 4.4, extra content
curator role 3.9, à-la-carte permissions 3.0). The owner is the single **super
administrator**: only role able to grant or revoke the **moderator** role and to intervene on
someone's account. There is always at least one super administrator. A moderator handles
reports, removal disputes and suspends abusive accounts or associations; a moderator never
appoints anyone. Every grant, revocation and suspension is logged and notified by email;
suspensions can be disputed and reversed by the super administrator. Roles inside an
association remain out of scope.

## Out of scope for V1 (deferred)

- Ticketing, payments and donations (an external link is allowed).
- Registration, capacity and attendance; the existing participation feature is frozen.
- Community extensions: new comments features, ranks, follows, notifications, AI assistance,
  recurring events and templates.
- Write API, multi-organizer aggregator access and a native mobile app.
- Fine-grained roles inside an association.
- Audience analytics requiring consent (#61).

Existing accounts, comments and participation code is kept but not extended in V1.

## Success measures

No measure requires tracking code. Pilot associations are not yet identified (HappiHub is
unknown today); pilot-based measures apply once local associations are recruited, which
requires the owner's explicit authorization before contacting anyone.

| # | Measure | Threshold | Collection |
| --- | --- | --- | --- |
| S1 | Active pilot associations | 3 associations, ≥ 2 published events each over 2 months | Database query (when pilots exist) |
| S2 | API-backed association website | ≥ 1 site in production | `lastUsedAt` per API key (also a security signal) |
| S3 | Fast creation | 4 of 5 volunteers create and publish in < 5 minutes | Timed usability session |
| S4 | Draft-to-publication rate | ≥ 70 % | Database query |
| S5 | Volunteer satisfaction | ≥ 4 / 5 | One question after S3 |
| S6 | Publish once | No re-entry on pilot websites | Pilot interview |
| S7 | Accessibility | 0 blocking WCAG 2.1 AA issue on create, edit, publish, browse | Automated audit + manual check |

Until pilots exist, V1 is validated on S2, S4 and S7 with the owner as first organizer,
plus usability sessions on the creation journey.

## Constraints

- Personal project, zero budget: free or near-free hosting, solo maintenance, no paid services.
- EU hosting and GDPR: data minimization, legal notice and privacy policy, account deletion.
- French first: interface strings externalized for later translation (#60).
- Accessible (WCAG 2.1 AA on key journeys) and usable on mobile, including the editor.
- Maintainable alone: few dependencies, required CI, nothing exotic.
- Safe, light images: size and type limits, EXIF metadata stripped (#62).
- No imposed delivery date; pace follows conception approval.

## Personas

See [V1 personas](v1-personas.md): Claire (primary organizer), Malik (communication and web volunteer in the same troupe), Inès (visitor), plus anti-personas.

## Next workshop

Workshop 2 — user journeys and UX: organizer onboarding, event creation (easy and playful),
editing, preview, publication, public event page and API key setup. Journeys drive the
use-case diagrams, then wireframes (#249).
