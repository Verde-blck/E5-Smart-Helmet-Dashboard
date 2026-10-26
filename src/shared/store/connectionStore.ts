import { create } from 'zustand'

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
