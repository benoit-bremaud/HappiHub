# QA pass for #382: cultural poster design

Local stack on 2026-10-29: client on port 3010, API on 5010, disposable PostgreSQL on 55432 with the demo seed. Chromium via Playwright.

| Check | 320 | 375 | 390 | 768 | 1440 |
| --- | --- | --- | --- | --- | --- |
| axe color-contrast and target-size violations (home, sign-in, event page) | 0 | 0 | 0 | 0 | 0 |
| Header overlap / horizontal scroll (C3, V4) | no / no | no / no | no / no | no / no | no / no |
| Smallest header target | 44 px | 44 px | 44 px | 44 px | 44 px |
| First card top vs viewport height (V1) | 266 / 640 | 233 / 812 | 233 / 844 | 173 / 1024 | 173 / 900 |
| Columns (V7, A2) | 1 | 1 | 1 | 2 | 3 |

- C4: the cancelled event page says "cancelled" once.
- V5: fonts come from localhost:3010 only. The pre-existing Bootstrap CSS CDN link in `public/index.html` is a stylesheet, not a font host.
- Fixed during the pass: the classic poster now has a hairline edge on the paper ground. Decision A2 (one grid from 48 rem) was validated by Benoit.
- Not covered by this pass: the editor preview (V8, C6) needs a signed-in session and is left to the owner QA.

Screenshots: `home-*.png`, `home-*-scrolled.png`, `event-*.png`, `signin-390.png`.
