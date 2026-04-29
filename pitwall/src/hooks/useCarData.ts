import { useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCarData } from '../api/openf1'
import type { OpenF1CarData } from '../api/openf1'
import { useSessionStore } from '../store/sessionStore'
import { useFakeTelemetryStore } from '../store/fakeTelemetryStore'

// Incremental polling hook for /car_data, modelled after useLocation.
// Only enabled in live mode — car data for a full historical session would be huge.
export function useCarData(driverNumber?: number | null) {
  const apiKey = useSessionStore((s) => s.apiKey) ?? undefined
  const sessionKey = useSessionStore((s) => s.activeSession?.session_key)
  const mode = useSessionStore((s) => s.mode)
  const fakeEnabled = useFakeTelemetryStore((s) => s.enabled)
  const buildSample = useFakeTelemetryStore((s) => s.buildSample)

  // date_gt cursor — advances each fetch to only pull new samples
  const cursorRef = useRef<string | undefined>(undefined)
  const latestRef = useRef<OpenF1CarData | null>(null)

  useEffect(() => {
    cursorRef.current = undefined
    latestRef.current = null
  }, [sessionKey, driverNumber])

  return useQuery({
    queryKey: ['car_data', sessionKey, driverNumber, fakeEnabled],
    queryFn: async () => {
      if (fakeEnabled && driverNumber) {
        return buildSample(driverNumber)
      }

      const raw = await fetchCarData(sessionKey!, driverNumber!, apiKey, cursorRef.current)

      if (raw.length > 0) {
        const newest = raw.reduce((a, b) => (a.date > b.date ? a : b))
        latestRef.current = newest
        cursorRef.current = newest.date
      }

      return latestRef.current
    },
    enabled: fakeEnabled ? !!driverNumber : (!!sessionKey && !!driverNumber && mode === 'live'),
    staleTime: fakeEnabled ? Infinity : 3_000,
    refetchInterval: fakeEnabled ? false : 5_000,
    retry: (failureCount, error) => (error as any)?.status !== 429 && failureCount < 2,
  })
}
