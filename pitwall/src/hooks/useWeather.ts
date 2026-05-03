import { useQuery } from '@tanstack/react-query'
import { fetchWeather } from '../api/openf1'
import { fetchFastF1Weather } from '../api/fastf1Bridge'
import { useSessionStore } from '../store/sessionStore'
import { queryModePolicy } from './queryModePolicy'
import { readSessionData, writeSessionData, isSessionDataComplete } from '../lib/f1PersistentStore'
import type { OpenF1Weather } from '../api/openf1'
import type { FastF1WeatherSample } from '../api/fastf1Bridge'

const GC_24H = 24 * 60 * 60 * 1_000

function normalizeFastF1Weather(sample: FastF1WeatherSample): OpenF1Weather {
  return {
    session_key: 0,
    date: '',
    air_temperature: sample.AirTemp,
    track_temperature: sample.TrackTemp,
    humidity: sample.Humidity,
    pressure: sample.Pressure,
    wind_direction: sample.WindDirection,
    wind_speed: sample.WindSpeed,
    rainfall: sample.Rainfall ? 1 : 0,
  }
}

export function useWeather(options?: { preload?: boolean }) {
  const apiKey = useSessionStore((s) => s.apiKey) ?? undefined
  const sessionKey = useSessionStore((s) => s.activeSession?.session_key)
  const mode = useSessionStore((s) => s.mode)
  const dataSource = useSessionStore((s) => s.dataSource)
  const fastf1Ref = useSessionStore((s) => s.activeFastF1Session)
  const fastf1Available = useSessionStore((s) => s.fastf1ServerAvailable)

  const usingFastF1 = dataSource === 'fastf1' && fastf1Available && !!fastf1Ref

  const liveRefetchInterval = options?.preload ? false : 30_000

  const openf1Query = useQuery({
    queryKey: ['weather', sessionKey],
    queryFn: async () => {
      const key = sessionKey!
      const complete = await isSessionDataComplete('weather', key)
      if (complete) {
        const stored = await readSessionData<OpenF1Weather>('weather', key)
        if (stored.length > 0) return stored
      }
      const data = await fetchWeather(key, apiKey)
      void writeSessionData('weather', key, data, mode === 'historical')
      return data
    },
    enabled: !usingFastF1 && !!sessionKey,
    ...queryModePolicy(mode, {
      staleTime: 30_000,
      refetchInterval: liveRefetchInterval,
    }),
  })

  const fastf1Query = useQuery({
    queryKey: ['weather', 'fastf1', fastf1Ref?.year, fastf1Ref?.round, fastf1Ref?.session],
    queryFn: async () => {
      const data = await fetchFastF1Weather(fastf1Ref!)
      return data.map(normalizeFastF1Weather)
    },
    enabled: usingFastF1,
    staleTime: Infinity,
    gcTime: GC_24H,
  })

  return usingFastF1 ? fastf1Query : openf1Query
}
