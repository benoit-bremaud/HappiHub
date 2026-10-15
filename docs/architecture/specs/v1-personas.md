# HappiHub V1 — personas

Status: validated by the owner on 2026-10-15 (conception workshop 1).
Derived from the [V1 product framing](v1-product-framing.md). Every V1 journey, use case and
wireframe names the persona it serves. Design for Claire first: if the editor works for her,
it works for Malik; the reverse is not true.

## Shared scenario

Claire and Malik belong to **Les Tréteaux du Quartier**, an amateur theatre troupe of about
25 members. The troupe owns its events on HappiHub. Claire creates them; Malik, invited by
Claire with the same rights, polishes them and connects the troupe's WordPress site through
the read API. Inès discovers the events from a shared link.

## Claire — primary persona (organizer)

| | |
| --- | --- |
| Profile | 58, president of the troupe, retired school administrator |
| Digital skills | Low: smartphone and Facebook; afraid of "breaking something" |
| Devices and context | Tablet or phone, in the evening, often interrupted; wears reading glasses |
| Goal | Announce the next show **quickly** and make it **look good** |
| Frustrations | Long forms, jargon, not knowing whether it is published |
| Key moment | "I made my first poster in 5 minutes!" |
| Journeys | Sign up the association, create an event, preview and publish, invite a member, cancel or archive |
| Success measures | S3, S5, S7 |

## Malik — secondary persona (communication and web volunteer)

| | |
| --- | --- |
| Profile | 31, member of the same troupe, handles social media and the WordPress site |
| Digital skills | Good: Canva, WordPress, some HTML |
| Devices and context | Laptop, focused sessions |
| Goal | Publish once and see the event appear on the troupe's website |
| Frustrations | Re-entering content everywhere, broken copy-paste, ugly layouts |
| Key moment | "The website updated itself." |
| Journeys | Accept an invitation, edit an event created by Claire, create an API key, embed events on the site |
| Success measures | S2, S6 |

## Inès — visitor persona (public, no account)

| | |
| --- | --- |
| Profile | 34, lives in the neighbourhood, two children |
| Digital skills | Medium, almost everything on mobile; sometimes uses enlarged text |
| Devices and context | Phone, through a link shared by a friend or on the troupe's site |
| Goal | Know what, where, when and how much in seconds, then share it |
| Frustrations | Slow pages, missing information, being asked to create an account |
| Key moment | "I had the information in 10 seconds on my phone." |
| Journeys | Open a public event page, see a cancellation, share the event |
| Success measures | S7 |

## Anti-personas (explicitly not served in V1)

| Anti-persona | Wants | Why not in V1 |
| --- | --- | --- |
| Sophie, programmer of a 400-seat venue | Ticketing, capacity, fine-grained roles, hundreds of events | Excluded by the framing (ticketing, registration, roles) |
| An agenda aggregator | Read every organizer's events through the API | Excluded (aggregators, multi-organizer access) |
| A spammer | Mass-publish fake events | Not served; justifies rate limits and reporting in a V1 without prior moderation |
