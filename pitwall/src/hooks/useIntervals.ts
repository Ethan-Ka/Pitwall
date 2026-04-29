import { useMemo } from 'react'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { fetchIntervals as fetchOpenF1Intervals } from '../api/openf1'
import { useSessionStore } from '../store/sessionStore'
import type { OpenF1Interval } from '../api/openf1'
import { queryModePolicy } from './queryModePolicy'
import { readSessionData, writeSessionData, isSessionDataComplete } from '../lib/f1PersistentStore'
import { useFastF1Laps } from './useFastF1'
import type { FastF1SessionRef } from '../api/fastf1Bridge'

// Normalizes FastF1 lap data to OpenF1Interval shape (minimal example, expand as needed)
function normalizeFastF1Intervals(fastf1Laps: any[]): OpenF1Interval[] {
  // This is a placeholder: you may need to derive intervals from FastF1 lap data or another FastF1 endpoint
  return fastf1Laps.map(lap => ({
    driver_number: lap.DriverNumber,
    gap_to_leader: lap.GapToLeader,
    date: lap.Date,
    // ...add more fields as needed
  }))
}

export function useIntervalHistory(options?: { preload?: boolean }) {
  const apiKey = useSessionStore((s) => s.apiKey) ?? undefined
  const sessionKey = useSessionStore((s) => s.activeSession?.session_key)
  const mode = useSessionStore((s) => s.mode)
  const dataSource = useSessionStore((s) => s.dataSource)
  const fastf1Available = useSessionStore((s) => s.fastf1ServerAvailable)
  const activeFastF1Session = useSessionStore((s) => s.activeFastF1Session)
  const liveRefetchInterval = options?.preload ? false : 8_000

  const useFastF1 =
    mode === 'historical' && fastf1Available && dataSource === 'fastf1' && !!activeFastF1Session

  if (useFastF1) {
    // Use FastF1 laps as a proxy for intervals (customize as needed)
    const lapsQuery = useFastF1Laps(activeFastF1Session as FastF1SessionRef)
    return {
      ...lapsQuery,
      data: lapsQuery.data ? normalizeFastF1Intervals(lapsQuery.data) : undefined,
    }
  }

  return useQuery({
    queryKey: ['intervals-history', sessionKey],
    queryFn: async () => {
      const key = sessionKey!

      const complete = await isSessionDataComplete('intervals', key)
      if (complete) {
        const stored = await readSessionData<OpenF1Interval>('intervals', key)
        if (stored.length > 0) return stored
      }

      const stored = complete ? [] : await readSessionData<OpenF1Interval>('intervals', key)

      try {
        const all = await fetchOpenF1Intervals(key, apiKey)

        if (all.length === 0 && stored.length > 0) return stored

        void writeSessionData('intervals', key, all, mode === 'historical')
        return all
      } catch (error) {
        if (stored.length > 0) return stored
        throw error
      }
    },
    enabled: !!sessionKey,
    ...queryModePolicy(mode, {
      staleTime: 5_000,
      refetchInterval: liveRefetchInterval,
    }),
    retry: (failureCount, error) => (error as any)?.status !== 429 && failureCount < 2,
  })
}

export function useIntervals(options?: { preload?: boolean }) {
  const historyQuery = useIntervalHistory(options)

  const latestIntervals = useMemo(() => {
    if (!historyQuery.data) return undefined
    const map = new Map<number, OpenF1Interval>()
    for (const interval of historyQuery.data) {
      const existing = map.get(interval.driver_number)
      if (!existing || interval.date > existing.date) {
        map.set(interval.driver_number, interval)
      }
    }
    return Array.from(map.values())
  }, [historyQuery.data])

  return {
    ...historyQuery,
    data: latestIntervals,
  } as UseQueryResult<OpenF1Interval[], Error>
}
