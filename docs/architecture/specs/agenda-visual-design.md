# Agenda visual design — the cultural poster direction (#367)

Status: **validated by Benoît on 2026-10-29** (decisions D1–D7, top MCDA score each time,
weights accepted; D5 and D6 are weight-sensitive, see § 4). UI code needs its own implementation brick.

Realises the presentation of [UC21](v1-use-cases.md#uc21--browse-upcoming-events). UML: not applicable
(visual design only; behaviour is unchanged from the [public-agenda spec](public-agenda.md)).

Scope: the public agenda (home page, [public-agenda spec](public-agenda.md)) and the event
card/poster it shows, mobile first. The tokens defined here become the shared base that later
screens (event page, organizer editor) extend; those screens are not redesigned here.
Related: #285 (header overlap on mobile), #304 (date locale), logo pending, Clément/Yazii
feedback still to be requested (needs the owner's authorization).

## 1. Problem

The agenda works (#366) but the owner finds it unappealing (2026-10-28): a huge
"Welcome visitor!" pushes events below the fold, the header overlaps on phones, cards are
plain white boxes with system type, and the six poster styles chosen by organizers are barely
visible. The agenda must make visitors want to go out; the redesign replaces the current
look rather than polishing it.

Hard constraint from real data: **events have no photos**. They carry a `posterStyle`
(`classic`, `bold`, `paper`, `night`, `pastel`, `minimal`), a type (one of 8 `EventType` values,
`server/domain/event.js`), a title, dates, venue, city and price.

## 2. Research — mood board (2026-10-29, phone width 375 px)

| Reference | Link | Taken from it |
| --- | --- | --- |
| DICE | <https://dice.fm/browse/paris> | Big grotesque headings, category tiles, hand-drawn illustration, coloured date |
| Resident Advisor | <https://ra.co/events/fr/paris> | Condensed uppercase section titles, one accent colour, pill filters |
| Luma | <https://lu.ma/discover> | Date-first list, text-led and very legible |
| Shotgun | <https://shotgun.live/fr/cities/paris> | Image-led nightlife cards (rejected direction) |
| Dribbble "event discovery app" | <https://dribbble.com/shots/27808244-Vibora-Event-Discovery-Ticketing-App>, <https://dribbble.com/shots/27637606-Outer-Social-Event-and-Community-Mobile-App-Design> | Dominant trend: dark, violet/magenta gradients, full-bleed photos (generic) |
| Awwwards "Events" | <https://www.awwwards.com/sites/kelvin-music-festival-2027>, <https://www.awwwards.com/sites/perform-europe>, <https://www.awwwards.com/sites/design-bomb-festival> | XXL poster type, flat bold colour, editorial layout |

The mood board is partial. Not reached: Pinterest (sign-in required, not attempted), Que Faire à Paris (navigation
refused); Godly, Land-book and Mobbin can be added in a later pass.

## 3. The idea

"On HappiHub, **each event's own poster** becomes the agenda card." The organizer's
`posterStyle` choice is visible from the first screen; the page around it stays quiet paper.

## 4. Decisions (MCDA, scores 0–5, totals /500)

Full matrices (criteria, weights, scores) are in the appendix. Sensitivity re-normalises the
other weights so they still sum to 100. The runner-up is the recorded design fallback.

| ID | Question | Chosen | Score | Runner-up (fallback) | Sensitivity |
| --- | --- | --- | --- | --- | --- |
| D1 | Visual direction | **A Cultural poster** | 450 | D Minimal programme list 385 | simplicity 10→20: A 433, D 398 |
| D2 | What drives card colour | **A organizer's `posterStyle`** (6 redesigned palettes) | 450 | B colour per type 320 | type recognition 15→30: A 424, B 352 |
| D3 | Typography | **B Bricolage Grotesque**, one variable family, self-hosted | 450 | A Anton + system 380 | poster effect 30→45: B 439, A 406 |
| D4 | Mobile layout | **E full-width poster cards under sticky day headers** | 445 | C compact list 410 | scan 25→40: E 436, C 428 (close) |
| D5 | Motion | **A press feedback only** | 440 | B + staggered entrance 370 | delight 20→40: A 380, B 378 (near tie) |
| D6 | Page ground / dark mode | **A light paper only in V1**, role-named tokens | 425 | B auto light/dark 375 | comfort 25→40: tie 400/400 |
| D7 | Home top | **A compact header, agenda first** | 450 | B XXL tagline hero 335 | identity 25→45: A 410, B 379 |


## 5. Design specification

### 5.1 Tokens (to be introduced as custom properties in `client/src/index.css`, the single source)

| Token | Role | Value (to tune at build, AA checked) |
| --- | --- | --- |
| `--hh-ground` | page background, warm paper | `#f4efe6` |
| `--hh-ink` | main text | `#1c1a17` |
| `--hh-ink-muted` | secondary text | `#5c564c` |
| `--hh-accent` | links, focus, active filter | `#d2452b` (vermilion) |
| `--hh-surface` | sheets, filter panel | `#fffaf2` |
| `--hh-danger` | "Cancelled" badge | existing |

Poster palettes (`--hh-poster-bg/fg/accent` per `posterStyle`), redesigned as flat, saturated
print colours; every pair must reach WCAG AA (4.5:1 body, 3:1 ≥ 24 px):
`classic` cream/ink/vermilion, `bold` ink/white/yellow, `paper` kraft/brown, `night`
deep blue/ice, `pastel` pink/plum, `minimal` white/ink. Token names stay role-based so a dark
theme only adds values (D6 fallback).

### 5.2 Type

Bricolage Grotesque variable (OFL), self-hosted woff2 with Latin + Latin-1 subsets
(no third-party font CDN). Roles: `display` (poster title, condensed width, weight 700–800,
clamp 1.75–2.5 rem), `date-numeral` (day number, 800), `label` (type, uppercase, tracking
0.08 em), `body` (normal width, 400, 1 rem / 1.5). Axes and file weight to verify at build.

### 5.3 Layout (phone 390 px, min-width queries upward)

```text
┌────────────────────────────┐
│ HappiHub            ☰      │  compact header, 56 px, no overlap (#285)
│ Culture & community events │  one-line tagline, muted
├────────────────────────────┤
│ This week      [Filter ▾]  │  filter: one button (public-agenda AC9)
├────────────────────────────┤
│ SATURDAY 31 OCTOBER        │  sticky day header
│ ┌────────────────────────┐ │
│ │ 31  THEATRE            │ │  poster card, full width,
│ │ OCT                    │ │  colours from posterStyle
│ │ Le Malade imaginaire   │ │  display type
│ │ 21:00 · Salle des fêtes│ │
│ │ Paris · Free           │ │
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ …                      │ │
└────────────────────────────┘
```

- ≥ 768 px: two cards per row under each day header; ≥ 1200 px: three, max width 1200 px.
- Whole card is one link (≥ 44 px target); focus ring in `--hh-accent`.
- "Cancelled" stays a badge on the poster (public-agenda AC8).
- Previous/Next pagination unchanged (D2 of the agenda spec).

### 5.4 Motion

Press feedback only: `transform: scale(0.98)` over ~120 ms ease-out on `:active`; no entrance
animation; disabled under `prefers-reduced-motion: reduce`.

## 6. Acceptance criteria (for the later implementation brick)

- **V1** At 390 px the first event card is visible without scrolling.
- **V2** Each card renders its `posterStyle` palette; all six pass WCAG AA.
- **V3** Events are grouped under sticky day headers in `startsAt` order.
- **V4** Header does not overlap content at 320–1440 px (#285).
- **V5** Fonts are served from the HappiHub origin; no request to a third-party font host.
- **V6** No motion other than press feedback; none with reduced motion.
- **V7** Layout: 1 column < 768 px, 2 columns ≥ 768 px, 3 columns ≥ 1200 px.

## 7. Open points

- Logo (pending) will replace the text wordmark.
- Clément/Yazii review of this direction, when the owner authorizes contact.
- Date locale (#304) to align with the day headers.
- Dark theme: later study (D6).

## Appendix — MCDA matrices (scores 0–5; total = Σ score × weight)

**D1 Visual direction** — identity 25, works without photos 20, mobile legibility 20,
distinctiveness 15, simplicity 10, reuse on organizer screens 10.

| Option | Id. | Photos | Legib. | Distinct. | Simple | Reuse | Total |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **A Cultural poster** | 5 | 5 | 4 | 5 | 3 | 4 | **450** |
| B Vibrant night (photo-led, dark) | 3 | 1 | 3 | 2 | 3 | 2 | 235 |
| C Warm neighbourhood (illustrated) | 4 | 3 | 4 | 3 | 3 | 4 | 355 |
| D Minimal programme list | 3 | 4 | 5 | 2 | 5 | 5 | 385 |

**D2 Card colour** — organizer's work visible 30, lively poster agenda 20, type at a glance 15,
contrast control 20, simplicity 15.

| Option | Organizer | Lively | Type | Contrast | Simple | Total |
| --- | --- | --- | --- | --- | --- | --- |
| **A `posterStyle`** | 5 | 5 | 3 | 4 | 5 | **450** |
| B colour per type | 2 | 4 | 5 | 3 | 3 | 320 |
| C one house palette | 2 | 2 | 3 | 5 | 4 | 305 |

**D3 Typography** — poster effect 30, long titles and French accents 20, privacy and
performance 20, simplicity 15, fits the six styles 15.

| Option | Poster | Titles | Privacy | Simple | Styles | Total |
| --- | --- | --- | --- | --- | --- | --- |
| A Anton + system | 5 | 3 | 4 | 3 | 3 | 380 |
| **B Bricolage Grotesque** | 4 | 5 | 4 | 5 | 5 | **450** |
| C system only | 1 | 5 | 5 | 5 | 2 | 335 |
| D Fraunces + Inter | 3 | 5 | 3 | 3 | 4 | 355 |

**D4 Mobile layout** — scan many events 25, poster impact 25, accessibility 20, simplicity 15,
scales with min-width 15.

| Option | Scan | Impact | A11y | Simple | Scale | Total |
| --- | --- | --- | --- | --- | --- | --- |
| A full-width posters | 3 | 5 | 5 | 5 | 4 | 435 |
| B two-column grid | 4 | 3 | 3 | 4 | 4 | 355 |
| C compact list | 5 | 2 | 5 | 4 | 5 | 410 |
| D carousel per day | 2 | 4 | 3 | 2 | 3 | 285 |
| **E A + sticky day headers** | 4 | 5 | 5 | 4 | 4 | **445** |

**D5 Motion** — simplicity 30, accessibility 25, performance 25, delight 20.

| Option | Simple | A11y | Perf. | Delight | Total |
| --- | --- | --- | --- | --- | --- |
| **A press feedback only** | 5 | 5 | 5 | 2 | **440** |
| B + staggered entrance | 3 | 4 | 4 | 4 | 370 |
| C tilt / parallax | 1 | 2 | 2 | 5 | 230 |

**D6 Ground / dark mode** — legibility across scenes 25, simplicity 25, poster palette
coherence 25, user comfort 25.

| Option | Legib. | Simple | Palettes | Comfort | Total |
| --- | --- | --- | --- | --- | --- |
| **A light paper only (V1)** | 4 | 5 | 5 | 3 | **425** |
| B auto light/dark | 5 | 2 | 3 | 5 | 375 |
| C dark only | 2 | 4 | 3 | 2 | 275 |

**D7 Home top** — first event visible at 390 px 35, identity and welcome 25, progressive
disclosure 20, simplicity 20.

| Option | Fold | Identity | Disclosure | Simple | Total |
| --- | --- | --- | --- | --- | --- |
| **A compact header, agenda first** | 5 | 3 | 5 | 5 | **450** |
| B XXL tagline hero | 2 | 5 | 3 | 4 | 335 |
| C current welcome, smaller | 3 | 2 | 3 | 5 | 315 |

Correction (recomputed by script after the session): D2 was shown as A 460, B 325, C 310 and
D7 as B 325, C 330, and the D2, D5 and D7 sensitivities were mis-added. The values here and in
§ 4 are the recomputed ones; no winner changes.
