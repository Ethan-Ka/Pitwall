// Shared formatters and UI primitives used across widgets

export type UnitMode = 's' | 'ms'

export function formatTime(seconds: number | null | undefined): string {
  if (seconds == null) return '—'
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60)
    const s = (seconds % 60).toFixed(3).padStart(6, '0')
    return `${m}:${s}`
  }
  return seconds.toFixed(3)
}

export function formatGap(gap: number | string | null | undefined): string {
  if (gap == null) return '—'
  if (typeof gap === 'string') return gap
  if (gap === 0) return 'LEADER'
  return `+${gap.toFixed(3)}`
}

export function formatInterval(interval: number | string | null | undefined): string {
  if (interval == null) return '—'
  if (typeof interval === 'string') return interval
  return `+${interval.toFixed(3)}`
}

export function formatLap(seconds: number | null | undefined, units: UnitMode = 's'): string {
  if (seconds == null) return '—'
  if (units === 'ms') return `${Math.round(seconds * 1000)} ms`
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60)
    const remainder = (seconds % 60).toFixed(3).padStart(6, '0')
    return `${minutes}:${remainder}`
  }
  return seconds.toFixed(3)
}

export function formatDelta(deltaSeconds: number | null, units: UnitMode = 's'): string {
  if (deltaSeconds == null) return '—'
  if (Math.abs(deltaSeconds) < 0.0005) return 'MATCH'
  const sign = deltaSeconds > 0 ? '+' : '-'
  const abs = Math.abs(deltaSeconds)
  if (units === 'ms') return `${sign}${Math.round(abs * 1000)} ms`
  return `${sign}${abs.toFixed(3)}`
}

export function EmptyState({ message, subMessage }: { message: string; subMessage?: string }) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--mono)',
    }}>
      <span style={{ fontSize: 9, color: 'var(--muted)' }}>{message}</span>
      {subMessage && <span style={{ fontSize: 8, color: 'var(--muted2)' }}>{subMessage}</span>}
    </div>
  )
}
