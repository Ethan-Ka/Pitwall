import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OpenF1Session } from '../api/openf1'

type AppMode = 'live' | 'historical' | 'onboarding'

interface SessionStore {
  apiKey: string | null
  mode: AppMode
  activeSession: OpenF1Session | null
  setApiKey: (key: string) => void
  clearApiKey: () => void
  setMode: (mode: AppMode) => void
  setActiveSession: (session: OpenF1Session) => void
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      apiKey: null,
      mode: 'onboarding',
      activeSession: null,
      setApiKey: (key) => set({ apiKey: key, mode: 'live' }),
      clearApiKey: () => set({ apiKey: null, mode: 'historical' }),
      setMode: (mode) => set({ mode }),
      setActiveSession: (session) => set({ activeSession: session }),
    }),
    {
      name: 'pitwall-session',
      partialize: (s) => ({ apiKey: s.apiKey, mode: s.mode }),
    }
  )
)
