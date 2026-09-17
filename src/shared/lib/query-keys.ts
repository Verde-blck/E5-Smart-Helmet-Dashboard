/**
 * All query keys in one place, every one scoped by tenant.
 *
 * The tenant prefix is what makes `removeQueries({ queryKey: qk.tenant(id) })`
 * a complete cache teardown on tenant switch or logout, and it's what lets the
 * socket router invalidate precisely instead of nuking ['devices'].
 */
export const qk = {
  tenant: (t: string) => ['tenant', t] as const,
  profile: (t: string) => ['tenant', t, 'profile'] as const,
  roles: (t: string) => ['tenant', t, 'roles'] as const,
  users: (t: string) => ['tenant', t, 'users'] as const,
  devices: {
    all: (t: string) => ['tenant', t, 'devices'] as const,
    detail: (t: string, id: string) => ['tenant', t, 'devices', id] as const,
    telemetry: (t: string, id: string, range: string) =>
      ['tenant', t, 'devices', id, 'telemetry', range] as const,
  },
  alarms: {
    all: (t: string) => ['tenant', t, 'alarms'] as const,
    detail: (t: string, id: string) => ['tenant', t, 'alarms', id] as const,
  },
  media: {
    all: (t: string) => ['tenant', t, 'media'] as const,
    byDevice: (t: string, id: string) => ['tenant', t, 'media', 'device', id] as const,
    // Signed URLs are cached separately from the list so they can expire on
    // their own schedule without invalidating the gallery.
    url: (t: string, id: string) => ['tenant', t, 'media', 'url', id] as const,
  },
} as const
