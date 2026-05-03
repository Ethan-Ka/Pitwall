import { useQuery } from '@tanstack/react-query'
import { fetchStints } from '../api/openf1'
import { fetchFastF1Stints } from '../api/fastf1Bridge'
import { useSessionStore } from '../store/sessionStore'
import { queryModePolicy } from './queryModePolicy'
import { readSessionData, writeSessionData, isSessionDataComplete } from '../lib/f1PersistentStore'
import type { OpenF1Stint } from '../api/openf1'
import type { FastF1Stint } from '../api/fastf1Bridge'

const GC_24H = 24 * 60 * 60 * 1_000

function normalizeFastF1Stint(stint: FastF1Stint): OpenF1Stint {
  return {
    session_key: 0,
    driver_number: parseInt(stint.driver_number, 10),
    stint_number: stint.stint ?? 0,
    compound: stint.compound ?? 'UNKNOWN',
    tyre_age_at_start: stint.tyre_life_start ?? 0,
    lap_start: stint.lap_start,
    lap_end: stint.lap_end,
  }
}

export function useStints(driverNumber?: number, options?: { preload?: boolean }) {
  const apiKey = useSessionStore((s) => s.apiKey) ?? undefined
  const sessionKey = useSessionStore((s) => s.activeSession?.session_key)
  const mode = useSessionStore((s) => s.mode)
  const dataSource = useSessionStore((s) => s.dataSource)
  const fastf1Ref = useSessionStore((s) => s.activeFastF1Session)
  const fastf1Available = useSessionStore((s) => s.fastf1ServerAvailable)

  const usingFastF1 = dataSource === 'fastf1' && fastf1Available && !!fastf1Ref

  const liveRefetchInterval = options?.preload ? false : 10_000
  const sessionEnabled = driverNumber !== undefined || options?.preload === true

  const openf1Query = useQuery({
    queryKey: ['stints', sessionKey, driverNumber],
    queryFn: async () => {
      const key = sessionKey!
      const complete = await isSessionDataComplete('stints', key, driverNumber)
      if (complete) {
        const stored = await readSessionData<OpenF1Stint>('stints', key, driverNumber)
        if (stored.length > 0) return stored
      }
      const data = await fetchStints(key, driverNumber, apiKey)
      void writeSessionData('stints', key, data, mode === 'historical', driverNumber)
      return data
    },
    // Only enable when a session is selected AND either a driverNumber is provided
    // or the caller explicitly requested preloading. Prevents accidental full-session
    // fetches when driverNumber is undefined (widget not configured yet).
    enabled: !usingFastF1 && !!sessionKey && sessionEnabled,
    ...queryModePolicy(mode, {
      staleTime: 10_000,
      refetchInterval: liveRefetchInterval,
    }),
  })

  // Fetch all stints for the session; select filters to the requested driver client-side.
  const fastf1Query = useQuery({
    queryKey: ['stints', 'fastf1', fastf1Ref?.year, fastf1Ref?.round, fastf1Ref?.session],
    queryFn: async () => {
      const data = await fetchFastF1Stints(fastf1Ref!)
      return data.map(normalizeFastF1Stint)
    },
    enabled: usingFastF1 && sessionEnabled,
    select: driverNumber !== undefined
      ? (stints) => stints.filter((s) => s.driver_number === driverNumber)
      : undefined,
    staleTime: Infinity,
    gcTime: GC_24H,
  })

  return usingFastF1 ? fastf1Query : openf1Query
}
