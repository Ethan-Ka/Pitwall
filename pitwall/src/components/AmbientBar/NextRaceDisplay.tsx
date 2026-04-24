import { useEffect, useMemo } from 'react'
import { useSessions } from '../../hooks/useSession'

export function NextRaceDisplay({ year = new Date().getFullYear() }: { year?: number }) {
  // Get all sessions for the year
  const { data: sessions, isLoading } = useSessions(year)

  // Find the next race session (future date, type 'Race')
  const nextRace = useMemo(() => {
    if (!sessions) return null
    const now = new Date()
    return sessions
      .filter(s => s.session_type === 'Race' && new Date(s.date_start) > now)
      .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())[0] || null
  }, [sessions])

  if (isLoading) return <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted2)' }}>Loading next race...</div>
  if (!nextRace) return <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted2)' }}>No upcoming race found</div>

  const date = new Date(nextRace.date_start)
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      background: 'var(--bg4)',
      border: '1px solid var(--border2)',
      borderRadius: 6,
      padding: '10px 16px',
      margin: '8px 0',
      minWidth: 220,
      boxShadow: '0 2px 8px #0002',
    }}>
      <span style={{ fontFamily: 'var(--cond)', fontSize: 15, fontWeight: 700, color: 'var(--blue)', letterSpacing: '0.04em', marginBottom: 2 }}>
        Next Race
      </span>
      <span style={{ fontFamily: 'var(--cond)', fontSize: 13, color: 'var(--white)', marginBottom: 2 }}>
        {nextRace.session_name}
      </span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted2)', marginBottom: 2 }}>
        {nextRace.circuit_short_name} — {nextRace.country_name}
      </span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>
        {date.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}
