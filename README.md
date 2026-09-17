# Helmet Dashboard — Frontend Scaffold

React + TypeScript + Vite scaffold implementing the architecture in
`helmet-dashboard-architecture.md` and `helmet-dashboard-architecture-part2.md`:
module-based RBAC, SaaS/standalone tenant switching, React Query + WebSocket
live data, and Zustand for auth/tenant session state.

## What's real vs stubbed

**Fully wired (safe to build on top of):**
- Auth bootstrap (`app/providers/AppBootstrap.tsx`) — resolves tenant +
  session once on load, branching on `VITE_MULTI_TENANT`
- Module registry + `module:action` RBAC (`shared/constants/modules.ts`,
  `shared/hooks/usePermission.ts`, `shared/components/ProtectedRoute.tsx`,
  `shared/components/Can.tsx`)
- Sidebar nav generated from the user's permitted modules
- `devices` module end-to-end: types → api → React Query hooks →
  components → pages, including a device detail route
- Dashboard overview (reuses the devices module's components)
- Login page (React Hook Form + Zod) with error handling
- WebSocket transport with backoff + resync (`shared/lib/websocket-client.ts`)
  and event→cache routing (`app/realtime/socket-router.ts`)
- A 15-device mock fleet with simulated heartbeats, so the UI is fully
  browsable and *live* with `VITE_USE_MOCKS=true` and no backend running

**Stub pages only (build next, per the suggested order):**
- `media` — photo/video gallery, live call view
- `alarms` — alarm feed + detail
- `users` — role editor / module-permissions matrix
- `profile` — company name + logo uploader (white-label)

## Getting started

```bash
npm install
cp .env.example .env
npm run dev
```

With the default `.env` (`VITE_USE_MOCKS=true`) the app runs standalone against
a simulated fleet — no backend needed.

Sign in with any email and password. Use `operator@example.com` to sign in as a
restricted role (devices + alarms only) and see the sidebar and landing
redirect adapt.

## Presence is derived, not pushed

Devices carry `lastSeenAt` (epoch ms), not a `status` enum or a pre-rendered
"2h ago" string. `modules/devices/lib/presence.ts` maps age → `online` /
`degraded` / `offline`, recomputed on a 10s ticker (`shared/hooks/useNow.ts`).

This matters on cellular: a SIM-connected helmet drops constantly, so "we hold
an open socket" is the wrong definition of online. It also means a helmet that
dies silently goes stale on its own, with no event required.

Alarm state is a separate field (`activeAlarm`), because a helmet can be
connected *and* alarming at the same time.

## Realtime

One socket for the whole app. `websocket-client.ts` is transport only —
exponential backoff, explicit connect/disconnect intent, and an `onReconnect`
hook. `app/realtime/socket-router.ts` maps events into the React Query cache:

- heartbeats → `setQueryData` patch (no refetch; 15 helmets at 2/min would
  otherwise be 30 refetches a minute)
- alarms and media-ready → `invalidateQueries` (the socket payload lacks the
  joins the list views need)
- on reconnect → invalidate the whole tenant subtree, since events that
  arrived while the socket was down are gone

## Wiring up the real backend

1. Set `VITE_USE_MOCKS=false` in `.env`.
2. Point `VITE_API_BASE_URL` / `VITE_WS_URL` at the Spring Boot service.
3. Implement `GET /auth/me`, `POST /auth/login`, `POST /auth/logout`. The user
   payload is `{ id, name, email, role, permissions: string[] }` where each
   permission is `"<module>:<action>"` — e.g. `"devices:read"`. The backend
   must enforce these same strings on every endpoint; the frontend checks are
   UX only.
4. Implement `GET /devices`, `GET /devices/:id` matching
   `modules/devices/types.ts`.
5. Each module's `api/*.api.ts` file has an `env.useMocks` branch — delete it
   once the corresponding endpoint is live.

The `X-Tenant-Id` header sent in SaaS mode is a **hint for localhost dev only**.
The backend must derive the tenant from the session claim and validate the
header against it, never trust it.

## SaaS vs standalone

Controlled entirely by `VITE_MULTI_TENANT` — see
`app/providers/AppBootstrap.tsx` for the single branch point. Standalone
branding (name, logo, colours) comes from `VITE_*` env vars, so a white-label
deploy needs no code change.

## Theming

Brand colours live in CSS variables as space-separated RGB channels
(`--brand-primary: 15 118 110`), which is what lets Tailwind's
`rgb(var(--x) / <alpha-value>)` form work. Use `bg-brand-primary`,
`bg-brand-primary/10`, `hover:bg-brand-primary/90` — not inline styles.

Hex → channel conversion happens in `shared/lib/color.ts`; tenant config and
the future colour picker stay in hex.

## Adding a new module

1. Add an entry to `shared/constants/modules.ts`.
2. Create `src/modules/<name>/<Name>Page.tsx`.
3. Add a `<Route>` wrapped in `<ProtectedRoute perm="<name>:read">` in
   `app/routes.tsx`.

The sidebar and route guards pick it up automatically.
