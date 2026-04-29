import { useQuery } from '@tanstack/react-query'
import { fetchWeather as fetchOpenF1Weather } from '../api/openf1'
import { useFastF1Weather } from './useFastF1'
import { useSessionStore } from '../store/sessionStore'
import { queryModePolicy } from './queryModePolicy'
import { readSessionData, writeSessionData, isSessionDataComplete } from '../lib/f1PersistentStore'
import type { OpenF1Weather } from '../api/openf1'
import type { FastF1SessionRef } from '../api/fastf1Bridge'

// Normalizes FastF1 weather to OpenF1Weather shape (expand as needed)
function normalizeFastF1Weather(fastf1Weather: any[]): OpenF1Weather[] {
  return fastf1Weather.map(w => ({
    air_temperature: w.AirTemp,
    track_temperature: w.TrackTemp,
    humidity: w.Humidity,
    wind_speed: w.WindSpeed,
    wind_direction: w.WindDir,
    // ...add more fields as needed
  }))
}

export function useWeather(options?: { preload?: boolean }) {
  const apiKey = useSessionStore((s) => s.apiKey) ?? undefined
  const sessionKey = useSessionStore((s) => s.activeSession?.session_key)
  const mode = useSessionStore((s) => s.mode)
  const dataSource = useSessionStore((s) => s.dataSource)
  const fastf1Available = useSessionStore((s) => s.fastf1ServerAvailable)
  const activeFastF1Session = useSessionStore((s) => s.activeFastF1Session)
  const liveRefetchInterval = options?.preload ? false : 30_000

  const useFastF1 =
    mode === 'historical' && fastf1Available && dataSource === 'fastf1' && !!activeFastF1Session

  if (useFastF1) {
    return useFastF1Weather(activeFastF1Session as FastF1SessionRef)
  }

  // OpenF1 path (default)
  return useQuery({
    queryKey: ['weather', sessionKey],
    queryFn: async () => {
      const key = sessionKey!
      const complete = await isSessionDataComplete('weather', key)
      if (complete) {
        const stored = await readSessionData<OpenF1Weather>('weather', key)
        if (stored.length > 0) return stored
      }
      const data = await fetchOpenF1Weather(key, apiKey)
      void writeSessionData('weather', key, data, mode === 'historical')
      return data
    },
    enabled: !!sessionKey,
    ...queryModePolicy(mode, {
      staleTime: 30_000,
      refetchInterval: liveRefetchInterval,
    }),
  })
}
