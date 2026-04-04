import { usePositions } from '../../hooks/usePositions'
import { useDriverStore } from '../../store/driverStore'

interface RunningOrderStripProps {
  widgetId: string
}

export function RunningOrderStrip({ widgetId: _ }: RunningOrderStripProps) {
  const { data: positions } = usePositions()
  const { getDriver, getTeamColor } = useDriverStore()

  const sorted = positions ?? []

  // Split into 4 rows of 5
  const rows: typeof sorted[] = [[], [], [], []]
  sorted.forEach((pos, i) => {
    const rowIndex = Math.floor(i / 5)
    if (rowIndex < 4) rows[rowIndex].push(pos)
  })

  if (sorted.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        fontFamily: 'var(--mono)',
        fontSize: 9,
        color: 'var(--muted2)',
      }}>
        Waiting for position data…
      </div>
    )
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'grid',
      gridTemplateRows: 'repeat(4, 1fr)',
      gap: 2,
      padding: '4px 6px',
      overflow: 'hidden',
    }}>
      {rows.map((rowDrivers, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {rowDrivers.map((pos) => {
            const driver = getDriver(pos.driver_number)
            const color = getTeamColor(pos.driver_number)

            return (
              <div
                key={pos.driver_number}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  flex: 1,
                }}
              >
                {/* Colored circle */}
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: color,
                  boxShadow: `0 0 4px ${color}88`,
                  flexShrink: 0,
                }} />
                {/* Driver abbr */}
                <span style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 6,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  lineHeight: 1,
                }}>
                  {driver?.name_acronym ?? `${pos.driver_number}`}
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
