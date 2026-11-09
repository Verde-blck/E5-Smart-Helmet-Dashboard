# E5 Smart Helmet Dashboard

React, TypeScript and Vite command centre for a fleet of IoT safety helmets:
live status and location, alarms, gas monitoring, live video and calls, voice
messages, media, fences, connectivity and per-helmet configuration.

Runs against the live backend, or entirely on mock data with no backend at all.

## Getting started

```bash
npm install
cp .env.example .env
npm run dev
```

Then open `http://localhost:5173`.

The default `.env` has `VITE_USE_MOCKS=true`, which runs a simulated
fifteen-helmet fleet with live heartbeats and needs no backend.

**Mock sign-ins** (any password works):

| Username    | What it shows                                                  |
| ----------- | -------------------------------------------------------------- |
| `ADM-001`   | Super admin: everything                                        |
| `OP-014`    | A restricted role: the sidebar and landing redirect adapt      |
| `VIEW-001`  | Dashboard and Track Playback only                              |
| `NEW-001`   | The forced "Set your own password" screen                      |
| `MFA-001`   | Two-factor sign-in; the code is always `123456`                |
| `SETUP-001` | An account the company requires to set up two-factor sign-in   |

**Live backend:** set `VITE_USE_MOCKS=false` and sign in with your own
account. Ask the project lead for access. **Never put real usernames or
passwords in this file, `.env.example`, or anywhere else in the repository.**

Keep mocks on for most development. The mocks cover states a small live fleet
can't show on demand: offline helmets, gas alarms in warning and danger, late
uploads, a deactivated unit, restricted roles.

## Modules

Twelve sidebar entries, each a folder under `src/modules`:

| Module            | What it does                                                                     |
| ----------------- | -------------------------------------------------------------------------------- |
| Dashboard         | Fleet counts, online gauge, alarm frequency, map, unresolved alarms              |
| Monitoring Center | Helmet tiles or table, search, registration, live wall (also in its own window)  |
| Live Map          | Google Maps with helmet pins, approximate-location circles, and fences           |
| Track Playback    | Route replay with scrubber, distance and uptime stats, CSV export                |
| Group Call        | Live calls with up to eight helmets, and voice messages to many helmets          |
| Photo Record      | Gallery filtered by helmet and date                                              |
| Video Record      | Calendar of recordings, plus clips still on a helmet's memory card               |
| Alarm Record      | All alarm types, details with location and footage, resolve and reopen           |
| Administrators    | Accounts, roles and permissions, helmet limits, groups, two-factor policy        |
| Unit Setting      | Per-helmet settings, including video split length                                |
| Connectivity      | Site Wi-Fi, each helmet's network and SIM, Wi-Fi scan, switch to mobile data     |
| Company Profile   | Name, support email, logo and brand colours, applied live                        |

A helmet's own page adds telemetry, gas readings, worker assignment ("Worn
by"), renaming, live view, calls, remote commands and voice messages. The
Security page (top bar) handles each user's own two-factor sign-in.

## Things to understand before changing anything

### 1. Every response is normalised at the module boundary

The API sends numbers as strings, voltage in millivolts, timestamps as ISO
text, and wraps lists in a Spring `Page`. None of that reaches a component.

`src/shared/lib/api-normalize.ts` converts it, and each module's
`api/*.api.ts` maps the API's shape onto the app's own types. That boundary is
where a backend change should be absorbed: if a fix needs a component change,
it's probably in the wrong place. It also parses `rawGasData`, the
semicolon-delimited gas sensor readings.

### 2. Some values are derived, not received

- **Presence**, from the age of `lastSeenAt`. Online is under two minutes,
  matching the backend's own rule; `degraded` (up to ten minutes) is a
  frontend-only middle state. See `modules/devices/lib/presence.ts`.
- **Alarm severity**, from the alarm type. Both SOS types, fall or impact,
  no movement, near live electricity and the four gas alarms are critical.
  See `modules/alarms/types.ts`.
- **A helmet's active alarm**, from the open alarms. The helmet list doesn't
  carry it; it drives the red map pins and the alarm badges.
- **Gas danger levels**, from thresholds in `modules/devices/lib/gas.ts`.
  These are widely used occupational defaults, **not an authority**, and need
  signing off by whoever owns site safety.
- **Track distance.** Legs implying more than 40 m/s are discarded as bad
  fixes, and approximate (non-GPS) positions don't count towards distance.

### 3. Media links expire

Photos, videos and voice clips come as signed links valid for one hour. Never
store them; the lists refetch well before they expire.

## Permissions

The backend enforces roles: every request is checked, and anything outside a
user's role is refused with `403 {"error":"forbidden","permission":"<code>"}`.
The dashboard reads each user's permissions from the sign-in response and
`/auth/me`, and shows only what the role allows.

Backend codes are module-level (`MONITORING_CENTER`, `ALARM_RECORD`). Seven
areas also have a `_MANAGE` code that allows changes as well as viewing.
`modules/users/lib/permissions.ts` translates codes into the app's
action-level guards (`devices:read`, `devices:write`).

A role refusal shows a message and never signs the user out. Only an expired
or missing token does that. Anyone signed in can join an open SOS call,
whatever their role.

## Real-time alarms

New alarms arrive over `GET /api/alarms/stream` (server-sent events, read with
`fetch` because `EventSource` can't send the auth header). It reconnects on
its own and replays missed alarms with `Last-Event-ID`. While the stream is
up, polling drops to a slow safety net.

Critical alarms open a centred box that rings until someone acts; warnings
show a short banner at the top. Browsers block sound until the user's first
click, so an "Enable alarm sound" prompt shows until then.

## Configuration

| Variable                                             | Notes                                              |
| ---------------------------------------------------- | -------------------------------------------------- |
| `VITE_USE_MOCKS`                                     | `true` runs the simulated fleet with no backend    |
| `VITE_API_BASE_URL`                                  | Leave as `/api`                                    |
| `VITE_API_PROXY_TARGET`                              | Where the dev server forwards `/api`               |
| `VITE_MULTI_TENANT`                                  | Keep `false`: one company per deployment           |
| `VITE_GOOGLE_MAPS_API_KEY`                           | Needed for the maps. Restrict it by HTTP referrer  |
| `VITE_GOOGLE_MAPS_MAP_ID`                            | Advanced markers won't load without one            |
| `VITE_APP_NAME`, `VITE_APP_LOGO_URL`, `VITE_BRAND_*` | Fallback branding until `/branding` loads          |

Settings are read at start-up: restart `npm run dev` after changing `.env`,
and redeploy after changing them on Vercel.

### Requests and CORS

All API calls go to `/api`. In development `vite.config.ts` proxies that to
`VITE_API_PROXY_TARGET`; in production `vercel.json` rewrites it to the
backend. Either way the browser only ever talks to its own origin.

Live video and calls go to the media server directly, so it must allow every
address the dashboard runs on.

## Deployment

Pushing to `main` deploys to Vercel. The production site is
`helmet.e5energyng.com`. A new address needs adding to the backend's allowed
origins, the Google Maps key and the media server first. The full steps are
in the setup and deployment manual.

## Dormant features

Two complete features sit switched off behind flags in `src/config/features.ts`:

- `realtimeSocket`: a WebSocket client for the backend's `/ws`, which belongs
  to the helmets, not the dashboard. Alarms use the event stream instead.
- `siteScoping`: site-based visibility filtering, dormant because roles and
  helmet limits now cover it.

## Known gaps

- **No self-service password reset.** Administrators reset passwords, and the
  user then sets their own at the next sign-in.
- **Text-to-speech.** Helmets can only play uploaded audio, so typed messages
  aren't spoken.

## Theming

Brand colours are CSS variables holding space-separated RGB channels
(`--brand-primary: 15 118 110`), which makes Tailwind's
`rgb(var(--x) / <alpha-value>)` form work. Use `bg-brand-primary`,
`bg-brand-primary/10`, `hover:bg-brand-primary/90`, not inline styles.

Hex to channel conversion lives in `shared/lib/color.ts`. Changing the colours
in Company Profile repaints the interface with no rebuild.

## Adding a module

1. Add an entry to `shared/constants/modules.ts`, with an icon from
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
public/         favicon set, logo, web manifest
```

Every module's `api/` folder holds one file that talks to the network and one
that fakes it, switched by `env.useMocks`.

Comments explain *why*, not *what*: if a line needs a comment to say what it
does, rename something instead.