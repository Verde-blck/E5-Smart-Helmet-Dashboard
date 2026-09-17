import { create } from 'zustand'

/**
 * FRD §4 Offline & Reconnection, and the acceptance criterion "WebSocket
 * disconnection and reconnection are handled correctly" — which someone will
 * test by watching the dashboard. Handling it silently is indistinguishable
 * from not handling it, so the state is surfaced in the Topbar.
 */
export type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'offline'

interface ConnectionStore {
  state: ConnectionState
  lastConnectedAt: number | null
  set: (state: ConnectionState) => void
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  state: 'offline',
  lastConnectedAt: null,
  set: (state) =>
    set((prev) => ({
      state,
      lastConnectedAt: state === 'live' ? Date.now() : prev.lastConnectedAt,
    })),
}))
