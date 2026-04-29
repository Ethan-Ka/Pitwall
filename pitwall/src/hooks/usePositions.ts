import { useQuery } from '@tanstack/react-query'
import { fetchPositions } from '../api/openf1'
import { fetchFastF1Results } from '../api/fastf1Bridge'
import { useSessionStore } from '../store/sessionStore'
import type { OpenF1Position } from '../api/openf1'
import type { FastF1Result } from '../api/fastf1Bridge'
import { queryModePolicy } from './queryModePolicy'
import { readSessionData, writeSessionData, isSessionDataComplete } from '../lib/f1PersistentStore'

const GC_24H = 24 * 60 * 60 * 1_000

function normalizeFastF1Result(result: FastF1Result): OpenF1Position {
  return {
    session_key: 0,
    driver_number: parseInt(result.DriverNumber, 10),
    date: '',
    position: result.Position ?? 99,
  }
}

// Returns latest position per driver (deduplicated + sorted by position)
export function usePositions() {
  const apiKey = useSessionStore((s) => s.apiKey) ?? undefined
  const sessionKey = useSessionStore((s) => s.activeSession?.session_key)
  const mode = useSessionStore((s) => s.mode)
  const dataSource = useSessionStore((s) => s.dataSource)
  const fastf1Ref = useSessionStore((s) => s.activeFastF1Session)

  const openf1Query = useQuery({
    queryKey: ['positions', sessionKey],
    queryFn: async () => {
      const key = sessionKey!

      // Positions are stored already deduplicated, so a stored hit is ready to return directly
      const complete = await isSessionDataComplete('positions', key)
      if (complete) {
        const stored = await readSessionData<OpenF1Position>('positions', key)
        if (stored.length > 0) return stored.sort((a, b) => a.position - b.position)
      }

      const all = await fetchPositions(key, apiKey)
      const map = new Map<number, OpenF1Position>()
      for (const p of all) {
        const existing = map.get(p.driver_number)
        if (!existing || p.date > existing.date) map.set(p.driver_number, p)
      }
      const deduplicated = Array.from(map.values()).sort((a, b) => a.position - b.position)

      // Store the deduplicated result — positions table PK is (session_key, driver_number)
      void writeSessionData('positions', key, deduplicated, mode === 'historical')

      return deduplicated
    },
    enabled: dataSource === 'openf1' && !!sessionKey,
    ...queryModePolicy(mode, {
      staleTime: 3_000,
      refetchInterval: 5_000,
    }),
    retry: (failureCount, error) => (error as any)?.status !== 429 && failureCount < 2,
  })

  // FastF1 uses race/qualifying results for final classification positions.
  // These are static post-session — not live position changes.
  const fastf1Query = useQuery({
    queryKey: ['positions', 'fastf1', fastf1Ref?.year, fastf1Ref?.round, fastf1Ref?.session],
    queryFn: async () => {
      const data = await fetchFastF1Results(fastf1Ref!)
      return data
        .filter((r) => r.Position != null)
        .map(normalizeFastF1Result)
        .sort((a, b) => a.position - b.position)
    },
    enabled: dataSource === 'fastf1' && !!fastf1Ref,
    staleTime: Infinity,
    gcTime: GC_24H,
  })

  return dataSource === 'fastf1' ? fastf1Query : openf1Query
}

// Returns position for a specific driver
export function useDriverPosition(driverNumber: number | null) {
  const { data: positions } = usePositions()
  if (!driverNumber || !positions) return null
  return positions.find((p) => p.driver_number === driverNumber) ?? null
}
