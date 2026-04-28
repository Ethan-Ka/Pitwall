import { useQuery } from '@tanstack/react-query'
import { fetchCircuitMap } from '../api/fastf1Bridge'
import { useSessionStore } from '../store/sessionStore'
import type { FastF1CircuitMap, FastF1SessionRef } from '../api/fastf1Bridge'

const GC_24H = 24 * 60 * 60 * 1_000

export function useCircuitMap(ref?: FastF1SessionRef | null) {
  const available = useSessionStore((s) => s.fastf1ServerAvailable)

  return useQuery({
    queryKey: ['fastf1', 'circuit_map', ref?.year, ref?.round, ref?.session],
    queryFn: () => fetchCircuitMap(ref!),
    enabled: !!ref && available,
    staleTime: Infinity,
    gcTime: GC_24H,
    retry: 1,
  })
}
