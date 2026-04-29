import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { fetchSessions, fetchLatestSession } from '../api/openf1'
import { fetchFastF1Events, type FastF1SessionRef } from '../api/fastf1Bridge'
import { useSessionStore } from '../store/sessionStore'
import { queryModePolicy } from './queryModePolicy'

const noRetry429 = (failureCount: number, error: unknown) =>
  (error as any)?.status !== 429 && failureCount < 2

export interface FastF1SessionRow {
  ref: FastF1SessionRef
  event_name: string
  circuit_name: string
  country: string
  session_name: string
  date: string | null
}

export function useSessions(year?: number) {
  const apiKey = useSessionStore((s) => s.apiKey) ?? undefined
  const mode = useSessionStore((s) => s.mode)
  const apiRequestsEnabled = useSessionStore((s) => s.apiRequestsEnabled)
  const dataSource = useSessionStore((s) => s.dataSource)
  return useQuery({
    queryKey: ['sessions', year, apiKey ? 'auth' : 'anon'],
    queryFn: () => fetchSessions({ year }, apiKey),
    enabled: dataSource === 'openf1' && mode !== 'onboarding' && apiRequestsEnabled,
    ...queryModePolicy(mode, {
      staleTime: 60_000,
      refetchInterval: false,
    }),
    retry: noRetry429,
  })
}

export function useLatestSession() {
  const apiKey = useSessionStore((s) => s.apiKey) ?? undefined
  const mode = useSessionStore((s) => s.mode)
  const apiRequestsEnabled = useSessionStore((s) => s.apiRequestsEnabled)
  const dataSource = useSessionStore((s) => s.dataSource)
  return useQuery({
    queryKey: ['sessions', 'latest', apiKey ? 'auth' : 'anon'],
    queryFn: () => fetchLatestSession(apiKey),
    enabled: dataSource === 'openf1' && mode !== 'onboarding' && apiRequestsEnabled,
    ...queryModePolicy(mode, {
      staleTime: 30_000,
      refetchInterval: 60_000,
    }),
    retry: noRetry429,
  })
}

export function useFastF1Sessions(year?: number): UseQueryResult<FastF1SessionRow[]> {
  const available = useSessionStore((s) => s.fastf1ServerAvailable)

  return useQuery({
    queryKey: ['fastf1', 'sessions', year],
    queryFn: async () => {
      const events = await fetchFastF1Events(year!)
      const rows: FastF1SessionRow[] = []
      for (const event of events) {
        for (const session of event.sessions) {
          rows.push({
            ref: { year: year!, round: event.round_number, session: session.type },
            event_name: event.event_name,
            circuit_name: event.circuit_name,
            country: event.country,
            session_name: session.name,
            date: event.date,
          })
        }
      }
      return rows
    },
    enabled: !!year && available,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1_000,
  })
}
