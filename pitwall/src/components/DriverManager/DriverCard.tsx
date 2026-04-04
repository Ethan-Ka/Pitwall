import type { OpenF1Driver } from '../../api/openf1'

interface DriverCardProps {
  driver: OpenF1Driver
  position: number | null
  isStarred: boolean
  onToggleStar: () => void
  onSetFocus: () => void
  isCanvasFocus: boolean
}

export function DriverCard({
  driver,
  position,
  isStarred,
  onToggleStar,
  onSetFocus,
  isCanvasFocus,
}: DriverCardProps) {
  const teamColor = `#${driver.team_colour}`

  return (
    <div
      onClick={onSetFocus}
      style={{
        width: 92,
        background: isCanvasFocus ? 'var(--bg3)' : 'var(--bg4)',
        border: isCanvasFocus
          ? '0.5px solid rgba(29,184,106,0.6)'
          : '0.5px solid var(--border)',
        borderRadius: 4,
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        flexShrink: 0,
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {/* Team color bar */}
      <div style={{
        height: 3,
        background: teamColor,
        boxShadow: `0 0 6px ${teamColor}88`,
      }} />

      <div style={{ padding: '8px 8px 6px' }}>
        {/* Position badge */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 4,
        }}>
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: 8,
            letterSpacing: '0.1em',
            color: 'var(--muted)',
            textTransform: 'uppercase',
          }}>
            {position != null ? `P${position}` : '—'}
          </span>
          {/* Driver number */}
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: 8,
            color: 'var(--muted)',
            letterSpacing: '0.05em',
          }}>
            #{driver.driver_number}
          </span>
        </div>

        {/* Driver abbreviation */}
        <div style={{
          fontFamily: 'var(--cond)',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '0.02em',
          lineHeight: 1,
          color: 'var(--white)',
          marginBottom: 4,
        }}>
          {driver.name_acronym}
        </div>

        {/* Team name */}
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: 7,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {driver.team_name}
        </div>
      </div>

      {/* Star icon */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleStar() }}
        style={{
          position: 'absolute',
          top: 6,
          right: 4,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 2,
          color: isStarred ? 'var(--gold)' : 'var(--muted2)',
          fontSize: 10,
          lineHeight: 1,
          transition: 'color 0.15s',
        }}
        aria-label={isStarred ? 'Unstar driver' : 'Star driver'}
      >
        {isStarred ? '★' : '☆'}
      </button>

      {/* Canvas focus indicator */}
      {isCanvasFocus && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: 'var(--green)',
          boxShadow: '0 0 6px var(--green)',
        }} />
      )}
    </div>
  )
}
