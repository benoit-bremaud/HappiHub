# HappiHub V1 — user journeys

Status: in progress (conception workshop 2). Each journey is validated separately by the
owner. Personas: [V1 personas](v1-personas.md). Scope: [V1 product framing](v1-product-framing.md).
Journeys drive the use-case diagrams, then wireframes (#249).

| # | Journey | Persona | Status |
| --- | --- | --- | --- |
| J1 | Discover HappiHub and sign up the association | Claire | To do |
| J2 | Create an event | Claire | **Validated 2026-10-15** |
| J3 | Preview, publish, then cancel or archive | Claire | To do |
| J4 | Invite a member and edit together | Claire, Malik | To do |
| J5 | Browse a public event page on mobile | Inès | To do |
| J6 | Connect the association website (API key) | Malik | To do |

## J2 — Create an event (Claire)

Decision: four-step wizard with a live poster preview (variant A4, score 4.7). Rejected:
three steps (overloads step 1), photo-only (blocks Claire without a photo), single form
(intimidating, preview lost on mobile), editable canvas (inaccessible, costly).
References considered: Luma (cover-first), Eventbrite (step wizard), Mobilizon
(association fields), Canva (styles); V1 keeps visual-first, few fields, guided input.

| Step | Fields (* required to publish) | Claire sees | Drop-off risk and mitigation |
| --- | --- | --- | --- |
| 1. What? | Title*, type (theatre, concert, exhibition, workshop…)*, short description* (300 chars), long description (optional) | Title appears large on the poster | Blank page: example titles and hooks per type |
| 2. When and where? | Start date/time*, end (optional), venue* (address suggestions), price (free, amount or pay-what-you-want) | Date and venue appear on the poster | Date/address formats: mobile-friendly picker, address suggestions |
| 3. Image | Upload a photo **or** pick one of 6 poster styles per type | Poster takes its colours | No photo: ready-made styles remove the blocker |
| 4. Preview and publish | None; summary and checklist | The public page as Inès will see it, mobile and desktop | Fear of publishing: "You can edit or cancel at any time" |

Always present: autosaved draft at each step ("Saved ✓"), progress bar, Back on every
step, resume where left off (Draft → Published lifecycle).

Playful touches, all accessible: poster building live, a sober celebration on first
publication (disabled under `prefers-reduced-motion`), warm microcopy ("Your show is taking
shape!"), poster styles per event type. None blocks keyboard or screen-reader use.

Success measures served: S3 (create and publish in < 5 minutes), S4, S5, S7.

Open points for the conception: address suggestion provider (must respect zero budget and
EU/GDPR), image limits and EXIF stripping (#62), poster style catalogue.
