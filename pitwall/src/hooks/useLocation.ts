import { useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchLocations } from '../api/openf1'
import { useSessionStore } from '../store/sessionStore'
import type { OpenF1Location } from '../api/openf1'
import { queryModePolicy } from './queryModePolicy'

export interface DriverXY {
  driverNumber: number
  x: number
  y: number
  date: string
}

interface TrackPoint { x: number; y: number }

const MAX_TRACK_POINTS = 3000

export function useLocation() {
  const apiKey = useSessionStore((s) => s.apiKey) ?? undefined
  const sessionKey = useSessionStore((s) => s.activeSession?.session_key)
  const mode = useSessionStore((s) => s.mode)

  // Cursor for live incremental fetches — ISO timestamp of the latest sample seen
  const cursorRef = useRef<string | undefined>(undefined)
  // Per-driver latest position
  const latestRef = useRef<Map<number, DriverXY>>(new Map())
  // Accumulated track outline points
  const trackPointsRef = useRef<TrackPoint[]>([])

  // Reset all refs when session changes
  useEffect(() => {
    cursorRef.current = undefined
    latestRef.current = new Map()
    trackPointsRef.current = []
  }, [sessionKey])

  const query = useQuery({
    queryKey: ['locations', sessionKey],
    queryFn: async () => {
      const key = sessionKey!
      const date_gt = mode === 'live' ? cursorRef.current : undefined
      const raw = await fetchLocations(key, undefined, apiKey, date_gt)

      // Update per-driver latest
      for (const loc of raw) {
        const existing = latestRef.current.get(loc.driver_number)
        if (!existing || loc.date > existing.date) {
          latestRef.current.set(loc.driver_number, {
            driverNumber: loc.driver_number,
            x: loc.x, y: loc.y, date: loc.date,
          })
        }
      }

      // Advance cursor for next live fetch
      if (mode === 'live' && raw.length > 0) {
        const latest = raw.reduce((a, b) => (a.date > b.date ? a : b))
        cursorRef.current = latest.date
      }

      // Accumulate track outline points (decimate to every 5th sample to reduce noise)
      const incoming = raw.filter((_, i) => i % 5 === 0)
      trackPointsRef.current.push(...incoming.map((l) => ({ x: l.x, y: l.y })))
      if (trackPointsRef.current.length > MAX_TRACK_POINTS) {
        trackPointsRef.current = trackPointsRef.current.slice(-MAX_TRACK_POINTS)
      }

      return Array.from(latestRef.current.values())
    },
    enabled: !!sessionKey,
    ...queryModePolicy(mode, {
      staleTime: 2_000,
      refetchInterval: 5_000,
    }),
    retry: (failureCount, error) => (error as any)?.status !== 429 && failureCount < 2,
  })

  return {
    ...query,
    trackPoints: trackPointsRef.current,
  }
}
