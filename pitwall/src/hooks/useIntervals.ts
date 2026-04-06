import { useMemo } from 'react'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { fetchIntervals } from '../api/openf1'
import { useSessionStore } from '../store/sessionStore'
import type { OpenF1Interval } from '../api/openf1'
import { queryModePolicy } from './queryModePolicy'
import { readIntervalHistory, upsertIntervalHistory } from '../lib/intervalCache'

export function useIntervalHistory(options?: { preload?: boolean }) {
  const apiKey = useSessionStore((s) => s.apiKey) ?? undefined
  const sessionKey = useSessionStore((s) => s.activeSession?.session_key)
  const mode = useSessionStore((s) => s.mode)
  const liveRefetchInterval = options?.preload ? false : 8_000

  return useQuery({
    queryKey: ['intervals-history', sessionKey],
    queryFn: async () => {
      const key = sessionKey!
      const cached = await readIntervalHistory(key)

      // Historical sessions are immutable. If we already have coverage, skip API usage.
      if (mode === 'historical' && cached && cached.length > 0) {
        return cached
      }

      try {
        const all = await fetchIntervals(key, apiKey)

        if (all.length === 0 && cached) return cached

        return upsertIntervalHistory(key, all)
      } catch (error) {
        if (cached && cached.length > 0) {
          return cached
        }
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
