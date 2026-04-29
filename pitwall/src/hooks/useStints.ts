import { useQuery } from '@tanstack/react-query'
import { fetchStints as fetchOpenF1Stints } from '../api/openf1'
import { useFastF1Stints } from './useFastF1'
import { useSessionStore } from '../store/sessionStore'
import { queryModePolicy } from './queryModePolicy'
import { readSessionData, writeSessionData, isSessionDataComplete } from '../lib/f1PersistentStore'
import type { OpenF1Stint } from '../api/openf1'
import type { FastF1SessionRef } from '../api/fastf1Bridge'

// Normalizes FastF1 stints to OpenF1Stint shape (expand as needed)
function normalizeFastF1Stints(fastf1Stints: any[]): OpenF1Stint[] {
  return fastf1Stints.map(stint => ({
    lap_start: stint.LapStart,
    lap_end: stint.LapEnd,
    compound: stint.Compound,
    driver_number: stint.DriverNumber,
    // ...add more fields as needed
  }))
}

export function useStints(driverNumber?: number, options?: { preload?: boolean }) {
  const apiKey = useSessionStore((s) => s.apiKey) ?? undefined
  const sessionKey = useSessionStore((s) => s.activeSession?.session_key)
  const mode = useSessionStore((s) => s.mode)
  const dataSource = useSessionStore((s) => s.dataSource)
  const fastf1Available = useSessionStore((s) => s.fastf1ServerAvailable)
  const activeFastF1Session = useSessionStore((s) => s.activeFastF1Session)
  const liveRefetchInterval = options?.preload ? false : 10_000

  const useFastF1 =
    mode === 'historical' && fastf1Available && dataSource === 'fastf1' && !!activeFastF1Session

  if (useFastF1) {
    // driverNumber is not used in FastF1 stints (session-wide)
    return useFastF1Stints(activeFastF1Session as FastF1SessionRef)
  }

  // OpenF1 path (default)
  return useQuery({
    queryKey: ['stints', sessionKey, driverNumber],
    queryFn: async () => {
      const key = sessionKey!
      const complete = await isSessionDataComplete('stints', key, driverNumber)
      if (complete) {
        const stored = await readSessionData<OpenF1Stint>('stints', key, driverNumber)
        if (stored.length > 0) return stored
      }
      const data = await fetchOpenF1Stints(key, driverNumber, apiKey)
      void writeSessionData('stints', key, data, mode === 'historical', driverNumber)
      return data
    },
    enabled: !!sessionKey && (driverNumber !== undefined || options?.preload === true),
    ...queryModePolicy(mode, {
      staleTime: 10_000,
      refetchInterval: liveRefetchInterval,
    }),
  })
}
