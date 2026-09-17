# Changes from the original scaffold

## Broken things

**`npm run build` failed** — `tsc -b` threw six `TS2339: Property 'env' does not
exist on type 'ImportMeta'` errors. Added `src/vite-env.d.ts` with the
`vite/client` reference plus an explicit `ImportMetaEnv` interface, so a typo
like `VITE_MULTITENANT` is now a compile error rather than a silent
`undefined`. (`vite build` alone always passed — esbuild strips types without
checking them, so this only surfaced in CI or a real build.)

**Brand colours with an opacity modifier compiled to nothing.** With
`primary: 'var(--brand-primary)'` in the Tailwind config, `bg-brand-primary`
worked but `bg-brand-primary/10` emitted no rule at all. CSS variables now hold
space-separated RGB channels and the config uses
`rgb(var(--brand-primary) / <alpha-value>)`. Hex→channel conversion lives in
`shared/lib/color.ts`, so tenant config and a future colour picker stay in hex.
The two inline `style={{ background: 'var(--brand-primary)' }}` usages are now
Tailwind classes.

**`wsClient.disconnect()` reconnected instead of disconnecting.** `close()`
fired `onclose`, which scheduled `setTimeout(connect, 2000)`. Added an explicit
`wanted` intent flag, handler detachment before close, exponential backoff with
jitter, an `onerror` handler, and a guard against opening a second socket.

**The `device.status` handler undid its own work.** `setQueryData(['devices',
id])` followed by `invalidateQueries({ queryKey: ['devices'] })` — v5 filters
are prefix matches, so it discarded the patch and refetched the whole fleet on
every heartbeat. Event routing moved to `app/realtime/socket-router.ts`, which
patches list and detail in place for heartbeats and invalidates only for events
that need server-side joins.

**Realtime never started after a form login.** `wsClient.connect()` only ran
inside `bootstrap()` after a successful `/auth/me`. It now runs in an effect
keyed on `isAuthenticated`, which covers both paths.

**`auth:unauthorized` had no listener.** `AppBootstrap` now subscribes and calls
`endSession()`; `RequireAuth` handles the redirect. The interceptor no longer
fires it for `/auth/login` (that 401 is "wrong password", which `LoginPage`
surfaces itself), and 403 still deliberately falls through so a missing
permission doesn't read as a session failure.

## Data model

**`status` split into presence + alarm.** `'online' | 'offline' | 'alarm'`
conflated two independent axes, so a helmet in alarm vanished from the "Online
now" count — 13 of a connected 14. Devices now carry `activeAlarm:
AlarmSeverity | null` separately.

**`lastUpdate: string` → `lastSeenAt: number`.** Presence is derived from the
timestamp in `modules/devices/lib/presence.ts` (`online` / `degraded` /
`offline`) and recomputed on a 10s ticker (`shared/hooks/useNow.ts`), so a
helmet that dies silently goes stale on its own. `useDevices` / `useDevice`
return `DeviceView` with presence resolved.

**Permissions are `module:action`.** `Permission = \`${ModuleKey}:${Action}\``.
`usePermission()` returns a checker rather than a boolean so one call site can
test several. Added `<Can perm="media:delete">` for sub-route gating and
`ALL_PERMISSIONS` for the future RoleEditor matrix.

**Query keys are tenant-scoped.** `shared/lib/query-keys.ts`; every key is
`['tenant', id, ...]`, which makes cache teardown on logout or tenant switch a
single `removeQueries` and lets the socket router invalidate precisely.

**One `Device` type.** It was declared in both `shared/lib/mock-data.ts` and
`modules/devices/types.ts`, free to drift. Device fixtures moved to
`modules/devices/api/devices.mock.ts`; `shared/` no longer carries a domain type.

## Consequences of the above

- **Landing redirect** (`app/LandingRedirect.tsx`) — a device-only role has no
  `dashboard:read`, and the old flow dropped it on `/unauthorized` rendered
  *outside* the Layout: no sidebar, no way out. It now shows the dashboard to
  those who can see it, redirects others to their first permitted module, and
  explains the situation to a user with none.
- **`/unauthorized` and a new 404 route render inside the Layout.**
- **`endSession()`** (`shared/lib/session.ts`) stops the socket, clears the
  auth store *and* clears the query cache, so the next person to sign in on
  that browser doesn't see the previous fleet flash. Optionally calls
  `POST /auth/logout`.
- **Login page** handles failures (it previously threw into the void),
  redirects an already-authenticated user, and returns to the page they were
  trying to reach.
- **Mock heartbeats** (`app/realtime/mock-heartbeats.ts`) drive the fleet
  through the real socket-router path every 5s. Without this, mock timestamps
  freeze at import and every helmet decays to `offline` 90 seconds after load.
  One device stays dark and one heartbeats rarely, so `offline` and `degraded`
  are both visible.
- **`mockOperator`** — sign in as `operator@example.com` with mocks on to
  exercise the restricted-role path.
- **Standalone branding via env** — `VITE_BRAND_PRIMARY` / `VITE_BRAND_SECONDARY`,
  so a white-label deploy needs no code change.
- Sidebar is `sticky` and no longer scrolls away; `RequireAuth` split out from
  `ProtectedRoute` so auth is checked once on the layout route.

## Known trade-off

`shared/lib/session.ts` imports from `app/realtime/` — a layering inversion.
The alternative was a registration callback, which seemed like more machinery
than the problem deserves at this size.
