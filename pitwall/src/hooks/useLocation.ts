import { useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchLocations } from '../api/openf1'
import { useSessionStore } from '../store/sessionStore'
import { queryModePolicy } from './queryModePolicy'
import { useFakeTelemetryStore } from '../store/fakeTelemetryStore'
import { useDriverStore } from '../store/driverStore'
import { useCircuitMap } from './useCircuitMap'
import { MELBOURNE_CIRCUIT_MAP } from '../data/melbourneCircuitMap'
import type { FastF1SessionRef } from '../api/fastf1Bridge'

export interface DriverXY {
  driverNumber: number
  x: number
  y: number
  date: string
}

interface TrackPoint { x: number; y: number }

const MAX_TRACK_POINTS = 3000
const DEFAULT_FAKE_DRIVER_NUMBERS = [1, 4, 6, 10, 11, 14, 16, 18, 22, 23, 24, 27, 30, 31, 44, 55, 63, 81, 87, 2]

export function useLocation() {
  const apiKey = useSessionStore((s) => s.apiKey) ?? undefined
  const sessionKey = useSessionStore((s) => s.activeSession?.session_key)
  const mode = useSessionStore((s) => s.mode)
  const fakeEnabled = useFakeTelemetryStore((s) => s.enabled)
  const buildLocationSamples = useFakeTelemetryStore((s) => s.buildLocationSamples)
  const buildTrackPoints = useFakeTelemetryStore((s) => s.buildTrackPoints)

  const f1Ref = useSessionStore((s) => s.activeFastF1Session)
  const activeYear = useSessionStore((s) => s.activeSession?.year)
  // In fake mode, never inherit the persisted f1Ref (which may point to any prior circuit).
  // Always resolve through the Melbourne fallback so fake drivers follow the right track.
  const { data: circuitMap } = useCircuitMap(null)

  const fakeFallbackRef: FastF1SessionRef | null =
    fakeEnabled ? { year: activeYear ?? 2026, round: 1, session: 'R' } : null
  const { data: fallbackCircuitMap } = useCircuitMap(fakeFallbackRef)
  const effectiveCircuitMap = circuitMap ?? fallbackCircuitMap ?? (fakeEnabled ? MELBOURNE_CIRCUIT_MAP : null)

  const cursorRef = useRef<string | undefined>(undefined)
  const latestRef = useRef<Map<number, DriverXY>>(new Map())
  const trackPointsRef = useRef<TrackPoint[]>([])

  useEffect(() => {
    cursorRef.current = undefined
    latestRef.current = new Map()
    trackPointsRef.current = []
  }, [sessionKey])

  const query = useQuery({
    queryKey: ['locations', sessionKey, fakeEnabled, effectiveCircuitMap?.x?.length ?? 0],
    queryFn: async () => {
      if (fakeEnabled) {
        const storeDrivers = useDriverStore.getState().drivers.map((d) => d.driver_number)
        const driverNumbers = storeDrivers.length > 0 ? storeDrivers : DEFAULT_FAKE_DRIVER_NUMBERS
        const trackX = effectiveCircuitMap?.x
        const trackY = effectiveCircuitMap?.y
        const samples = buildLocationSamples(driverNumbers, trackX, trackY)
        trackPointsRef.current = buildTrackPoints(trackX, trackY)
        return samples
      }

      const key = sessionKey!
      const date_gt = mode === 'live' ? cursorRef.current : undefined
      const raw = await fetchLocations(key, undefined, apiKey, date_gt)

      for (const loc of raw) {
        const existing = latestRef.current.get(loc.driver_number)
        if (!existing || loc.date > existing.date) {
          latestRef.current.set(loc.driver_number, {
            driverNumber: loc.driver_number,
            x: loc.x, y: loc.y, date: loc.date,
          })
        }
      }

      if (mode === 'live' && raw.length > 0) {
        const latest = raw.reduce((a, b) => (a.date > b.date ? a : b))
        cursorRef.current = latest.date
      }

      const incoming = raw.filter((_, i) => i % 5 === 0).map((l) => ({ x: l.x, y: l.y }))
      if (incoming.length > 0) {
        const merged = [...trackPointsRef.current, ...incoming]
        trackPointsRef.current = merged.length > MAX_TRACK_POINTS
          ? merged.slice(-MAX_TRACK_POINTS)
          : merged
      }

      return Array.from(latestRef.current.values())
    },
    enabled: fakeEnabled || !!sessionKey,
    ...queryModePolicy(mode, {
      staleTime: fakeEnabled ? 2_000 : 2_000,
      refetchInterval: fakeEnabled ? 2_000 : 5_000,
    }),
    retry: (failureCount, error) => (error as { status?: number })?.status !== 429 && failureCount < 2,
  })

  return {
    ...query,
    trackPoints: trackPointsRef.current,
  }
}
