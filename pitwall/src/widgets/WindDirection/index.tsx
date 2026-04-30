export const HELP = `# Wind Direction

Displays the current wind direction and speed at the circuit.

- **Compass**: Shows wind direction as a pointer and cardinal label (e.g., N, NE, SW).
- **Speed**: Wind speed in km/h or m/s, depending on data source.
- **Trend Arrow**: Indicates if wind speed is increasing (↑), decreasing (↓), or stable (—).

**Tips:**
- Wind direction is meteorological (where wind is coming from).
- Use the compass to quickly assess crosswinds or head/tail winds for the main straight.

**Notes:**
- Data updates live as new weather info arrives.
- If no data is available, the widget will show an empty state.

**Unfamiliar terms:**
- *Cardinal direction*: Standard compass points (N, NE, E, etc.).
- *Trend*: Change in wind speed since last update.
`
import { useWeather } from '../../hooks/useWeather'
import { useRefreshFade } from '../../hooks/useRefreshFade'
import { EmptyState } from '../widgetUtils'
import type { OpenF1Weather } from '../../api/openf1'

interface WindDirectionProps {
  widgetId: string
}

type Trend = 'up' | 'down' | 'flat'

function getTrend(current: number, previous: number): Trend {
  const diff = current - previous
  if (Math.abs(diff) < 0.05) return 'flat'
  return diff > 0 ? 'up' : 'down'
}

// 16-point cardinal direction from meteorological degrees
function windDirLabel(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  return dirs[Math.round(deg / 22.5) % 16]
}

function TrendArrow({ trend }: { trend: Trend }) {
  if (trend === 'flat') return <span style={{ color: 'var(--muted2)', fontSize: 10 }}>—</span>
  return (
    <span style={{
      color: trend === 'up' ? 'var(--red)' : 'var(--green)',
      fontSize: 11,
      lineHeight: 1,
    }}>
      {trend === 'up' ? '↑' : '↓'}
    </span>
  )
}

// Tick marks around the compass ring
function CompassTicks() {
  const ticks: React.ReactNode[] = []
  for (let i = 0; i < 16; i++) {
    const angleDeg = i * 22.5
    const isCardinal = i % 4 === 0
    const isIntercardinal = i % 2 === 0 && !isCardinal
    // Minor ticks (every 22.5°) are smallest; intercardinal medium; cardinal longest
    const innerR = isCardinal ? 40 : isIntercardinal ? 43 : 46
    const outerR = 50
    const rad = (angleDeg - 90) * (Math.PI / 180)
    const x1 = innerR * Math.cos(rad)
    const y1 = innerR * Math.sin(rad)
    const x2 = outerR * Math.cos(rad)
    const y2 = outerR * Math.sin(rad)
    ticks.push(
      <line
        key={i}
        x1={x1} y1={y1}
        x2={x2} y2={y2}
        stroke={isCardinal ? 'var(--muted)' : 'var(--border)'}
        strokeWidth={isCardinal ? 1.5 : 0.8}
      />
    )
  }
  return <>{ticks}</>
}

// N / E / S / W labels placed just inside the ring
function CardinalLabels() {
  const cardinals = [
    { label: 'N', x: 0, y: -34 },
    { label: 'E', x: 34, y: 1 },
    { label: 'S', x: 0, y: 38 },
    { label: 'W', x: -34, y: 1 },
  ]
  return (
    <>
      {cardinals.map(({ label, x, y }) => (
        <text
          key={label}
          x={x} y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={label === 'N' ? 'var(--red)' : 'var(--muted)'}
          fontSize={8}
          fontFamily="var(--mono)"
          letterSpacing="0.05em"
        >
          {label}
        </text>
      ))}
    </>
  )
}

interface CompassRoseProps {
  // Meteorological wind direction: the direction the wind is coming FROM
  direction: number
}

function CompassRose({ direction }: CompassRoseProps) {
  return (
    <svg
      viewBox="-60 -60 120 120"
      width="100%"
      style={{ flex: 1, minHeight: 0, overflow: 'visible' }}
    >
      {/* Outer ring */}
      <circle r={50} fill="none" stroke="var(--border)" strokeWidth={1} />
      {/* Inner decorative ring */}
      <circle r={22} fill="none" stroke="var(--border)" strokeWidth={0.5} strokeDasharray="2 3" />

      <CompassTicks />
      <CardinalLabels />

      {/*
        Needle group. The arrow tip points UP (toward SVG -Y = North) by default.
        We rotate by `direction` degrees so the tip points in the direction the
        wind is blowing FROM (meteorological). The opposite tail points where
        the wind blows TO.
      */}
      <g
        transform={`rotate(${direction})`}
        style={{ transition: 'transform 0.5s ease' }}
      >
        {/* Arrow head: tip pointing up (FROM direction) — colored cyan */}
        <polygon
          points="0,-38 -5,-22 0,-27 5,-22"
          fill="var(--cyan)"
        />
        {/* Shaft */}
        <line
          x1={0} y1={-27}
          x2={0} y2={20}
          stroke="var(--cyan)"
          strokeWidth={1.5}
        />
        {/* Tail fletching (pointing toward where wind blows TO) — muted */}
        <polygon
          points="0,38 -5,22 0,27 5,22"
          fill="var(--muted2)"
        />
        {/* Center dot */}
        <circle r={3} fill="var(--bg4)" stroke="var(--cyan)" strokeWidth={1} />
      </g>
    </svg>
  )
}

export function WindDirection({ widgetId: _ }: WindDirectionProps) {
  const { data } = useWeather()
  const refreshFade = useRefreshFade([data])

  const latest: OpenF1Weather | undefined = data?.[data.length - 1]
  const prev: OpenF1Weather | undefined = data?.[data.length - 2]

  if (!latest) {
    return <EmptyState message="Waiting for weather…" />
  }

  const direction = latest.wind_direction ?? 0
  const speed = latest.wind_speed ?? 0
  const rainfall = latest.rainfall ?? 0
  const cardinalLabel = windDirLabel(direction)
  const speedTrend: Trend = prev ? getTrend(speed, prev.wind_speed) : 'flat'

  return (
    <div
      className={refreshFade ? 'data-refresh-fade' : undefined}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '8px 10px',
        gap: 6,
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Header row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: 7,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--muted2)',
        }}>
          WIND
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Rain indicator */}
          {rainfall > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              padding: '1px 5px',
              border: '0.5px solid rgba(100,160,255,0.4)',
              borderRadius: 2,
              background: 'rgba(100,160,255,0.1)',
            }}>
              <div style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: 'var(--blue)',
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: 'var(--mono)',
                fontSize: 7,
                letterSpacing: '0.1em',
                color: 'var(--blue)',
              }}>
                RAIN
              </span>
            </div>
          )}

          {/* Wind speed badge */}
          <div style={{
            padding: '2px 6px',
            border: '0.5px solid var(--border)',
            borderRadius: 2,
            background: 'var(--bg4)',
            fontFamily: 'var(--mono)',
            fontSize: 9,
            color: 'var(--white)',
            letterSpacing: '0.06em',
          }}>
            {speed.toFixed(1)} m/s
          </div>
        </div>
      </div>

      {/* Compass SVG — fills available space */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <CompassRose direction={direction} />
      </div>

      {/* Footer row: cardinal label + speed + trend */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'center',
        gap: 8,
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: 'var(--cond)',
          fontSize: 20,
          fontWeight: 700,
          lineHeight: 1,
          color: 'var(--white)',
          letterSpacing: '0.04em',
        }}>
          {cardinalLabel}
        </span>
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--muted)',
          letterSpacing: '0.04em',
        }}>
          {speed.toFixed(1)} m/s
        </span>
        <TrendArrow trend={speedTrend} />
      </div>
    </div>
  )
}
