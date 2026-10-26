// The tenant prefix makes removeQueries(qk.tenant(id)) a complete teardown on sign-out.
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
    list: (t: string, query: Record<string, unknown>) =>
      ['tenant', t, 'media', query] as const,
    // Cached apart from the list so they expire on their own schedule.
    url: (t: string, id: string) => ['tenant', t, 'media', 'url', id] as const,
    calendar: (t: string, deviceId: string | null, month: string) =>
      ['tenant', t, 'media', 'calendar', deviceId, month] as const,
  },
  fences: {
    all: (t: string) => ['tenant', t, 'fences'] as const,
  },
}
