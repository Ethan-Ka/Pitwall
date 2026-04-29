
import { useQuery } from '@tanstack/react-query'
import { fetchPositions as fetchOpenF1Positions } from '../api/openf1'
import { useSessionStore } from '../store/sessionStore'
import type { OpenF1Position } from '../api/openf1'
import { queryModePolicy } from './queryModePolicy'
import { readSessionData, writeSessionData, isSessionDataComplete } from '../lib/f1PersistentStore'
import { useFastF1Laps } from './useFastF1'
import type { FastF1SessionRef } from '../api/fastf1Bridge'

// Normalizes FastF1 lap data to OpenF1Position shape (minimal example, expand as needed)
function normalizeFastF1Positions(fastf1Laps: any[]): OpenF1Position[] {
  // This is a placeholder: you may need to derive positions from FastF1 lap data or another FastF1 endpoint
  return fastf1Laps.map(lap => ({
    driver_number: lap.DriverNumber,
    position: lap.Position,
    date: lap.Date,
    // ...add more fields as needed
  }))
}

// Returns latest position per driver (deduplicated + sorted by position)
export function usePositions() {
  const apiKey = useSessionStore((s) => s.apiKey) ?? undefined
  const sessionKey = useSessionStore((s) => s.activeSession?.session_key)
  const mode = useSessionStore((s) => s.mode)
  const dataSource = useSessionStore((s) => s.dataSource)
  const fastf1Available = useSessionStore((s) => s.fastf1ServerAvailable)
  const activeFastF1Session = useSessionStore((s) => s.activeFastF1Session)

  const useFastF1 =
    mode === 'historical' && fastf1Available && dataSource === 'fastf1' && !!activeFastF1Session

  if (useFastF1) {
    // Use FastF1 laps as a proxy for positions (customize as needed)
    const lapsQuery = useFastF1Laps(activeFastF1Session as FastF1SessionRef)
    // You may need to normalize or compute positions from laps
    return {
      ...lapsQuery,
      data: lapsQuery.data ? normalizeFastF1Positions(lapsQuery.data) : undefined,
    }
  }

  return useQuery({
    queryKey: ['positions', sessionKey],
    queryFn: async () => {
      const key = sessionKey!
      const complete = await isSessionDataComplete('positions', key)
      if (complete) {
        const stored = await readSessionData<OpenF1Position>('positions', key)
        if (stored.length > 0) return stored.sort((a, b) => a.position - b.position)
      }

      const all = await fetchOpenF1Positions(key, apiKey)
      const map = new Map<number, OpenF1Position>()
      for (const p of all) {
        const existing = map.get(p.driver_number)
        if (!existing || p.date > existing.date) map.set(p.driver_number, p)
      }
      const deduplicated = Array.from(map.values()).sort((a, b) => a.position - b.position)

      void writeSessionData('positions', key, deduplicated, mode === 'historical')

      return deduplicated
    },
    enabled: !!sessionKey,
    ...queryModePolicy(mode, {
      staleTime: 3_000,
      refetchInterval: 5_000,
    }),
    retry: (failureCount, error) => (error as any)?.status !== 429 && failureCount < 2,
  })
}

// Returns position for a specific driver
export function useDriverPosition(driverNumber: number | null) {
  const { data: positions } = usePositions()
  if (!driverNumber || !positions) return null
  return positions.find((p) => p.driver_number === driverNumber) ?? null
}
