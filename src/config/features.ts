export const features = {
  // Dormant: every user is a command-centre administrator, so site scoping would hide helmets
  // they're responsible for.
  siteScoping: false,

  // Dormant: the backend's /ws is for helmets, not the dashboard. Polling stands in for push.
  realtimeSocket: false,

  pollIntervalMs: 10_000,
} as const
