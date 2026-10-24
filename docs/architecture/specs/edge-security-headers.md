# Edge security headers and source maps (#319, #320)

Status: approved by the owner on 2026-10-24 (MCDA option A, 480/500).
Source: [inspector QA pass](../qa/2026-10-24-inspector-pass.md), probes S1 and S9.

## Scope

- `client/nginx.conf`: response security headers on every response, `server_tokens off`.
- `client/Dockerfile` build stage: `GENERATE_SOURCEMAP=false`, `INLINE_RUNTIME_CHUNK=false`.

No application code, API or behavior change.

## Header values (server block, `always`)

| Header | Value |
|---|---|
| Content-Security-Policy | `default-src 'self'; script-src 'self'; style-src 'self' https://stackpath.bootstrapcdn.com; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `no-referrer` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains` |

`add_header` lives in the `server` block only; no `location` declares its own `add_header`,
so both locations inherit them (nginx drops inherited headers when a location adds one).

The headers also land on proxied `/api` responses. Express sets no CSP, HSTS,
X-Frame-Options or nosniff, but it does send `Referrer-Policy: no-referrer`
(`server/app.js`). The edge uses the same value (owner decision 2026-10-24, MCDA A
480/500, over hiding the upstream header 340 or keeping a weaker duplicate 285), so the
repeated header on `/api` is identical and can never weaken the API.

## CSP versus CRA constraints

- **Inline runtime chunk.** CRA inlines the webpack runtime as an inline `<script>` in
  `index.html` by default. `INLINE_RUNTIME_CHUNK=false` emits it as a file, so
  `script-src 'self'` holds with no `'unsafe-inline'`, nonce or hash.
- **API origin.** `connect-src` must match the origin of `REACT_APP_API_URL` baked at build
  time. The production image builds with `/api` (same origin, `docker-compose.prod.yml` and the
  Dockerfile default), so `'self'` covers it. The local dev compose uses the CRA dev server,
  not this nginx, so it is unaffected. A future cross-origin API build must add that origin.
- **Bootstrap.** `public/index.html` loads Bootstrap 4.5 CSS from `stackpath.bootstrapcdn.com`
  (with SRI), so that host is allowed in `style-src` only. React `style` props go through
  the CSSOM and need no `'unsafe-inline'`.

## HSTS behind TLS

The container listens on plain 8080 behind the operator's TLS edge (the config already
forces `X-Forwarded-Proto https`). Browsers ignore HSTS received over plain HTTP, so sending
it unconditionally is safe and lands correctly through the TLS edge. No `preload`.

## Verification

1. `docker build --target runtime client` succeeds.
2. Run the image; `curl -sI http://localhost:<port>/` and `/some/route` show all six headers
   and `Server: nginx` with no version.
3. `docker run --rm <image> find /usr/share/nginx/html -name '*.map'` prints nothing.
4. `grep -c '<script>' index.html` in the image is 0 (no inline script).
5. `curl -sI` on an `/api/` path returns nginx's response with the same headers.
6. Browser load of the SPA: no CSP violation in the console.
