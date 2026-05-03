import { useEffect } from 'react'
import { useSessionStore } from '../store/sessionStore'
import { useFastF1Events } from './useFastF1'
import type { FastF1Event } from '../api/fastf1Bridge'
import type { OpenF1Session } from '../api/openf1'

function synthSession(event: FastF1Event, sessionType: string, year: number): OpenF1Session {
  const session = event.sessions.find((s) => s.type === sessionType)
  return {
    session_key: 0,
    session_type: sessionType,
    session_name: session?.name ?? sessionType,
    circuit_short_name: event.circuit_name,
    date_start: event.date ?? '',
    date_end: event.date ?? '',
    year,
    country_name: event.country,
  }
}

// Automatically syncs activeFastF1Session (and a synthetic activeSession) to
// the current state without requiring OpenF1. Priority:
//   1. Match against OpenF1 activeSession if available (most accurate)
//   2. Fall back to the most recently started event by date (FastF1-only path)
// In historical mode: only seeds if nothing is selected yet.
// In live mode: always re-syncs.
export function useAutoFastF1Session() {
  const dataSource = useSessionStore((s) => s.dataSource)
  const activeSession = useSessionStore((s) => s.activeSession)
  const available = useSessionStore((s) => s.fastf1ServerAvailable)
  const activeFastF1Session = useSessionStore((s) => s.activeFastF1Session)
  const setActiveFastF1Session = useSessionStore((s) => s.setActiveFastF1Session)
  const setActiveSession = useSessionStore((s) => s.setActiveSession)
  const mode = useSessionStore((s) => s.mode)

  const year = activeSession?.year ?? new Date().getFullYear()

  const { data: events } = useFastF1Events(
    dataSource === 'fastf1' && available ? year : undefined
  )

  useEffect(() => {
    if (dataSource !== 'fastf1' || !available || !events?.length) return
    if (mode === 'historical' && activeFastF1Session !== null) return

    if (activeSession && activeSession.session_key !== 0) {
      // OpenF1 session is available — match it to a FastF1 event
      const event = events.find(
        (e) => e.country.toLowerCase() === (activeSession.country_name ?? '').toLowerCase()
      )
      if (!event) return

      const session = event.sessions.find(
        (s) => s.name.toLowerCase() === activeSession.session_name.toLowerCase()
      )
      if (!session) return

      const ref = { year, round: event.round_number, session: session.type }
      if (
        activeFastF1Session?.year === ref.year &&
        activeFastF1Session?.round === ref.round &&
        activeFastF1Session?.session === ref.session
      ) return

      setActiveFastF1Session(ref)
    } else {
      // No OpenF1 session — find the most recently started event by date
      const now = new Date()
      const pastEvents = events
        .filter((e): e is FastF1Event & { date: string } => !!e.date && new Date(e.date) <= now)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      const event = pastEvents[0]
      if (!event) return

      const raceSession = event.sessions.find((s) => s.type === 'R')
      const session = raceSession ?? event.sessions[event.sessions.length - 1]
      if (!session) return

      const ref = { year, round: event.round_number, session: session.type }
      if (
        activeFastF1Session?.year === ref.year &&
        activeFastF1Session?.round === ref.round &&
        activeFastF1Session?.session === ref.session
      ) return

      setActiveFastF1Session(ref)
      // Synthesize an OpenF1Session from FastF1 metadata so toolbar/ambient work
      setActiveSession(synthSession(event, session.type, year))
    }
  }, [dataSource, available, activeSession, events, activeFastF1Session, setActiveFastF1Session, setActiveSession, mode, year])
}
