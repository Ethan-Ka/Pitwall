import { useQuery } from '@tanstack/react-query'
import { fetchCircuitMap } from '../api/fastf1Bridge'
import { useSessionStore } from '../store/sessionStore'
import { saveCircuitMap, loadCircuitMap, hasCachedCircuitMap } from '../lib/circuitMapCache'
import type { FastF1CircuitMap, FastF1SessionRef } from '../api/fastf1Bridge'

const GC_24H = 24 * 60 * 60 * 1_000

function hasCached(year: number, round: number): boolean {
  return hasCachedCircuitMap(year, round)
}

export function useCircuitMap(ref?: FastF1SessionRef | null) {
  const available = useSessionStore((s) => s.fastf1ServerAvailable)

  return useQuery<FastF1CircuitMap>({
    queryKey: ['fastf1', 'circuit_map', ref?.year, ref?.round, ref?.session],
    queryFn: async () => {
      if (available) {
        try {
          const data = await fetchCircuitMap(ref!)
          saveCircuitMap(ref!.year, ref!.round, data)
          return data
        } catch (err) {
          const cached = loadCircuitMap(ref!.year, ref!.round)
          if (cached) return cached
          throw err
        }
      }
      // FastF1 not available — try cache only
      const cached = loadCircuitMap(ref!.year, ref!.round)
      if (cached) return cached
      throw new Error(`Circuit map for ${ref!.year} R${ref!.round} not cached`)
    },
    enabled: !!ref && (available || hasCached(ref.year, ref.round)),
    staleTime: Infinity,
    gcTime: GC_24H,
    retry: 1,
  })
}
