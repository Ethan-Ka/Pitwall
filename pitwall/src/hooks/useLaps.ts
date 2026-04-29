import { useQuery } from '@tanstack/react-query'
import { fetchLaps as fetchOpenF1Laps } from '../api/openf1'
import { useFastF1Laps } from './useFastF1'
import { useSessionStore } from '../store/sessionStore'
import { queryModePolicy } from './queryModePolicy'
import { readSessionData, writeSessionData, isSessionDataComplete } from '../lib/f1PersistentStore'
import type { OpenF1Lap } from '../api/openf1'
import type { FastF1SessionRef } from '../api/fastf1Bridge'

// Normalizes FastF1 lap data to OpenF1Lap shape (minimal example, expand as needed)
function normalizeFastF1Laps(fastf1Laps: any[]): OpenF1Lap[] {
  return fastf1Laps.map(lap => ({
    lap_number: lap.LapNumber,
    lap_duration: lap.LapTime,
    duration_sector_1: lap.Sector1Time,
    duration_sector_2: lap.Sector2Time,
    duration_sector_3: lap.Sector3Time,
    date_start: lap.Date,
    driver_number: lap.DriverNumber,
    // ...add more fields as needed
  }))
}

export function useLaps(
  driverNumber?: number,
  options?: { preload?: boolean; refetchIntervalMs?: number | false }
) {
  const apiKey = useSessionStore((s) => s.apiKey) ?? undefined
  const sessionKey = useSessionStore((s) => s.activeSession?.session_key)
  const mode = useSessionStore((s) => s.mode)
  const dataSource = useSessionStore((s) => s.dataSource)
  const fastf1Available = useSessionStore((s) => s.fastf1ServerAvailable)
  const activeFastF1Session = useSessionStore((s) => s.activeFastF1Session)
  const liveRefetchInterval =
    options?.refetchIntervalMs !== undefined
      ? options.refetchIntervalMs
      : options?.preload
        ? false
        : 15_000

  // FastF1 path (historical mode, FastF1 available, and selected)
  const useFastF1 =
    mode === 'historical' && fastf1Available && dataSource === 'fastf1' && !!activeFastF1Session

  if (useFastF1) {
    // driverNumber must be mapped to driver acronym for FastF1
    // This assumes driverNumber is the acronym, adapt as needed
    // (You may need to map driverNumber to acronym elsewhere)
    return useFastF1Laps(activeFastF1Session as FastF1SessionRef, driverNumber as any)
  }

  // OpenF1 path (default)
  return useQuery({
    queryKey: ['laps', sessionKey, driverNumber],
    queryFn: async () => {
      const key = sessionKey!
      const complete = await isSessionDataComplete('laps', key, driverNumber)
      if (complete) {
        const stored = await readSessionData<OpenF1Lap>('laps', key, driverNumber)
        if (stored.length > 0) return stored
      }
      const data = await fetchOpenF1Laps(key, driverNumber, apiKey)
      void writeSessionData('laps', key, data, mode === 'historical', driverNumber)
      return data
    },
    enabled: !!sessionKey && (driverNumber !== undefined || options?.preload === true),
    ...queryModePolicy(mode, {
      staleTime: 15_000,
      refetchInterval: liveRefetchInterval,
    }),
  })
}
