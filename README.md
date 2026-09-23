# E5 Smart Helmet Dashboard

React + TypeScript + Vite command centre for a fleet of IoT safety helmets —
live status, gas monitoring, location, alarms, media, voice messaging and
per-helmet configuration.

Runs against the live backend, or entirely on mock data with no backend at all.

## Getting started

```bash
npm install
cp .env.example .env
npm run dev
```

The default `.env` has `VITE_USE_MOCKS=true`, which runs a simulated
fifteen-helmet fleet with live heartbeats and needs no backend.

**Mock sign-ins** — any password works:

| Username | What it shows |
|---|---|
| `ADM-001` | Full administrator |
| `OP-014` | A restricted role — the sidebar and landing redirect adapt |
| `NEW-001` | The forced password change on first sign-in |

**Live backend** — set `VITE_USE_MOCKS=false` and sign in as `admin` /
`test1234`.

Keep mocks on for development and demos. The live fleet is a single test
device; the mocks cover states it can't show — offline helmets, gas alarms in
warning and danger, late uploads, a deactivated unit, restricted roles.

## Modules

Ten sidebar entries, each a folder under `src/modules`:

| Module | What it does |
|---|---|
| Dashboard | Fleet counts, online gauge, alarm frequency, map, unresolved alarms |
| Monitoring Center | Helmet tiles or table, search, registration, activate/deactivate |
| Live Map | Google Maps, markers coloured by presence — needs an API key |
| Track Playback | Route replay with scrubber, distance and uptime stats, CSV export |
| Photo Record | Gallery filtered by device and capture date |
| Video Record | File list — no backend source yet, see below |
| Alarm Record | Nine event types, resolve and reopen, fleet gas panel |
| Administrators | Accounts, permissions, groups |
| Unit Setting | Twenty-six per-helmet settings — no endpoint yet, see below |
| Company Profile | Name, logo, brand colours, applied live |

Device detail also carries telemetry, gas readings, status history, alarm
history, media, remote commands and voice messaging.

## Two things to understand before changing anything

### 1. Every response is normalised at the module boundary

The API sends numbers as strings, voltage in millivolts, timestamps as ISO
text, and wraps lists in a Spring `Page`. None of that reaches a component.

`src/shared/lib/api-normalize.ts` converts all of it, and each module's
`api/*.api.ts` file maps the API's shape onto the app's own types. That
boundary is where a backend change should be absorbed — if a fix needs
touching a component, it's probably in the wrong place.

It also parses `rawGasData`, the twelve semicolon-delimited gas sensors that
appear on every telemetry row.

### 2. Several values are derived, not received

The backend sends none of these:

- **Presence** — computed from the age of `lastSeenAt`. Online is under two
  minutes, matching the backend's own rule; `degraded` up to ten minutes is a
  frontend-only middle state. See `modules/devices/lib/presence.ts`.
- **Alarm severity** — inferred from the alarm type. SOS, fall, impact,
  near-electricity and silent are critical. See `modules/alarms/types.ts`.
- **Gas danger levels** — thresholds live in `modules/devices/lib/gas.ts`.
  They are widely-used occupational defaults, **not an authority**, and need
  signing off by whoever owns site safety.
- **Track distance** — legs implying more than 40 m/s are discarded as bad
  fixes. The live device's history contains readings from another continent;
  without this, a 13 km track measured 197,313 km.

## Dormant features

Two complete features sit switched off behind flags in `src/config/features.ts`:

- `realtimeSocket` — the WebSocket client, event router and reconnect logic
  all work, but the backend's `/ws` belongs to the helmets, not the dashboard.
  Polling stands in at `pollIntervalMs`.
- `siteScoping` — site-based visibility filtering, dormant since the dashboard
  was confirmed administrator-only.

Each is a one-line change to revive. The caveats are documented in that file.

## Permissions

The backend's permission codes are flat and module-level (`MONITORING_CENTER`,
`ALARM_RECORD`). The app's guards are action-level (`devices:read`), so
`modules/users/lib/permissions.ts` translates between them.

**These checks are presentational.** Login returns only a token — no role, no
permissions — so every signed-in account currently gets the full set. Nothing
is enforced anywhere until the backend enforces it.

## Configuration

| Variable | Notes |
|---|---|
| `VITE_USE_MOCKS` | `true` runs the simulated fleet with no backend |
| `VITE_API_BASE_URL` | Leave as `/api` in development — see CORS below |
| `VITE_API_PROXY_TARGET` | Where the dev server forwards `/api` |
| `VITE_MULTI_TENANT` | `true` for SaaS, `false` for a single-org install |
| `VITE_GOOGLE_MAPS_API_KEY` | Needed for the map. Restrict it by HTTP referrer |
| `VITE_GOOGLE_MAPS_MAP_ID` | Advanced markers won't load without one |
| `VITE_APP_NAME`, `VITE_APP_LOGO_URL`, `VITE_BRAND_*` | Standalone branding |
| `VITE_WS_URL` | Unused while `realtimeSocket` is dormant |

### CORS

The deployed API sends no CORS headers and its preflight returns 403, so a
browser blocks every request. Development works because `vite.config.ts`
proxies `/api` through the dev server, making requests same-origin.
`vercel.json` does the same at the edge for a deployed build.

Neither is a fix. A dashboard talking directly to the API needs the backend to
send `Access-Control-Allow-Origin` for its domain.

## Known gaps

Frontend work is complete for these; the backend isn't there yet:

- **Video Record** has no recordings endpoint — the module returns nothing.
- **Unit Setting** has no endpoint. The proposed contract is
  `GET`/`PUT /api/devices/{id}/settings`, matching
  `modules/unit-settings/types.ts`.
- **Text-to-speech** — the client wants typed text spoken by the helmet; the
  helmet can only play an uploaded audio file, so the text field is disabled.
- **Photos** return a placeholder string instead of a URL.
- **Voice message audio** is stored on the host's own disk and is lost when it
  restarts. Files have already gone missing.

## Theming

Brand colours are CSS variables holding space-separated RGB channels
(`--brand-primary: 15 118 110`), which is what makes Tailwind's
`rgb(var(--x) / <alpha-value>)` form work. Use `bg-brand-primary`,
`bg-brand-primary/10`, `hover:bg-brand-primary/90` — not inline styles.

Hex to channel conversion lives in `shared/lib/color.ts`; tenant config and the
colour picker stay in hex. Changing the primary colour in Company Profile
repaints the interface, including the background wash, with no rebuild.

## Adding a module

1. Add an entry to `shared/constants/modules.ts`, with an icon name from
   `shared/components/ModuleIcon.tsx`.
2. Map its key to a backend permission in `modules/users/lib/permissions.ts`.
3. Create `src/modules/<name>/<Name>Page.tsx`.
4. Add a `<Route>` wrapped in `<ProtectedRoute perm="<name>:read">` in
   `app/routes.tsx`.

The sidebar, role editor and route guards pick it up from there.

## Project shape

```
src/
  app/          routing, providers, realtime wiring
  config/       env vars and feature flags
  modules/      one folder per feature, each with api/ hooks/ components/
  shared/       components, hooks, lib used across modules
```

Every module's `api/` folder holds one file that talks to the network and one
that fakes it, switched by `env.useMocks`.