import { useQuery } from '@tanstack/react-query'
import { fetchTeamRadio } from '../api/openf1'
import { useSessionStore } from '../store/sessionStore'
import { queryModePolicy } from './queryModePolicy'

// OpenF1 is the only source with team radio data.
// FastF1 does not expose a team_radio accessor.
export function useTeamRadio(driverNumber?: number) {
  const apiKey = useSessionStore((s) => s.apiKey) ?? undefined
  const sessionKey = useSessionStore((s) => s.activeSession?.session_key)
  const mode = useSessionStore((s) => s.mode)
  const dataSource = useSessionStore((s) => s.dataSource)

  return useQuery({
    queryKey: ['team_radio', sessionKey, driverNumber],
    queryFn: () => fetchTeamRadio(sessionKey!, driverNumber, apiKey),
    enabled: dataSource === 'openf1' && !!sessionKey,
    ...queryModePolicy(mode, {
      staleTime: 30_000,
      refetchInterval: 30_000,
    }),
    retry: (failureCount, error) => (error as any)?.status !== 429 && failureCount < 2,
  })
}
