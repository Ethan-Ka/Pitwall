import { useQuery } from '@tanstack/react-query'
import { fetchWeather } from '../api/openf1'
import { useSessionStore } from '../store/sessionStore'

export function useWeather() {
  const apiKey = useSessionStore((s) => s.apiKey) ?? undefined
  const sessionKey = useSessionStore((s) => s.activeSession?.session_key)

  return useQuery({
    queryKey: ['weather', sessionKey],
    queryFn: async () => {
      const all = await fetchWeather(sessionKey!, apiKey)
      return all // Full history — latest is last item
    },
    enabled: !!sessionKey,
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}
