export const HELP = `# Points Delta Tracker

Area chart showing how the points gap between the championship leader and second place has evolved round-by-round across the season.

- **Area**: Filled region between zero and the points delta — the larger the area, the more dominant the leader's advantage.
- **X axis**: Race rounds, labelled by circuit abbreviation.
- **Y axis**: Championship points lead (leader minus second place). Zero = tied.
- **Stats**: Current leader and second-place driver names, each with their team colour and total points.

Unfamiliar terms:

- *Delta*: The difference in championship points between the leader (P1) and second-place driver (P2) at each round.
- *Round*: A completed race weekend — sprint weekends also contribute points and appear as rounds.

Notes: data comes from completed race results and updates after each round. If fewer than two drivers have results, the chart will not render. The chart always tracks the current leader vs. current second — if the championship order changes, the chart will reflect the new standings.
`
import { useMemo } from 'react'
import { useSeasonStandings } from '../../hooks/useSeasonStandings'
import type { DriverSeasonStanding } from '../../store/standingsStore'
import { useDriverStore } from '../../store/driverStore'
import { useRefreshFade } from '../../hooks/useRefreshFade'
import { EmptyState } from '../widgetUtils'

// ── constants ────────────────────────────────────────────────────────────────
const VIEW_W = 300
const VIEW_H = 80
// Y midpoint — zero-delta reference line
const MIDLINE = VIEW_H / 2

// ── types ───────────────────────────────────────────────────────────────────
interface DeltaPoint {
  round: number
  circuit: string
  delta: number
  leaderPts: number
  secondPts: number
}

interface ChartData {
  leader: DriverSeasonStanding
  second: DriverSeasonStanding
  points: DeltaPoint[]
}

// ── sub-components ───────────────────────────────────────────────────────────

function StatLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 7,
        color: 'var(--muted2)',
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  )
}

function StatValue({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      style={{
        fontFamily: 'var(--cond)',
        fontSize: 11,
        fontWeight: 700,
        color: color ?? 'var(--fg)',
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export function PointsDeltaTracker({ widgetId: _ }: { widgetId: string }) {
  const { standings, isLoading } = useSeasonStandings()
  const getDriver = useDriverStore((s) => s.getDriver)
  const getTeamColor = useDriverStore((s) => s.getTeamColor)
  const refreshFade = useRefreshFade([standings])

  // ── data derivation ────────────────────────────────────────────────────────
  const chartData = useMemo((): ChartData | null => {
    if (!standings || standings.length < 2) return null

    const [leader, second] = standings.slice(0, 2)

    const allRounds = [
      ...new Set([
        ...leader.raceResults.map((r) => r.round),
        ...second.raceResults.map((r) => r.round),
      ]),
    ].sort((a, b) => a - b)

    let leaderCum = 0
    let secondCum = 0
    const points: DeltaPoint[] = []

    for (const round of allRounds) {
      const lResult = leader.raceResults.find((r) => r.round === round)
      const sResult = second.raceResults.find((r) => r.round === round)
      leaderCum += lResult?.points ?? 0
      secondCum += sResult?.points ?? 0
      points.push({
        round,
        circuit: lResult?.circuitShortName ?? sResult?.circuitShortName ?? '',
        delta: leaderCum - secondCum,
        leaderPts: leaderCum,
        secondPts: secondCum,
      })
    }

    return { leader, second, points }
  }, [standings])

  // ── loading / empty states ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={outerStyle}>
        <EmptyState message="Loading standings…" />
      </div>
    )
  }

  if (!chartData || (standings?.length ?? 0) < 2) {
    return (
      <div style={outerStyle}>
        <EmptyState message="No standings data" />
      </div>
    )
  }

  if (chartData.points.length < 2) {
    return (
      <div style={outerStyle}>
        <EmptyState message="Not enough race data" />
      </div>
    )
  }

  const { leader, second, points } = chartData
  const leaderDriver = getDriver(leader.driverNumber)
  const secondDriver = getDriver(second.driverNumber)
  const leaderColor = getTeamColor(leader.driverNumber)
  const secondColor = getTeamColor(second.driverNumber)

  const leaderName = leaderDriver?.name_acronym ?? `#${leader.driverNumber}`
  const secondName = secondDriver?.name_acronym ?? `#${second.driverNumber}`

  const lastPoint = points.at(-1)!
  const currentGap = lastPoint.delta
  const totalRaces = points.length

  // ── SVG bar chart geometry ─────────────────────────────────────────────────
  const maxDelta = Math.max(...points.map((p) => Math.abs(p.delta)), 1)
  const numBars = points.length
  const slotW = VIEW_W / numBars
  const barW = Math.max(slotW - 2, 1)

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className={refreshFade ? 'data-refresh-fade' : undefined}
      style={outerStyle}
    >
      {/* Header: leader vs second + current gap */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontFamily: 'var(--cond)',
              fontSize: 14,
              fontWeight: 700,
              color: leaderColor,
              lineHeight: 1,
            }}
          >
            {leaderName}
          </span>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 7,
              color: 'var(--muted2)',
              letterSpacing: '0.06em',
            }}
          >
            vs
          </span>
          <span
            style={{
              fontFamily: 'var(--cond)',
              fontSize: 14,
              fontWeight: 700,
              color: secondColor,
              lineHeight: 1,
            }}
          >
            {secondName}
          </span>
        </div>

        {/* Current gap badge */}
        <span
          style={{
            fontFamily: 'var(--cond)',
            fontSize: 18,
            fontWeight: 700,
            color: leaderColor,
            lineHeight: 1,
          }}
        >
          {currentGap >= 0 ? '+' : ''}{currentGap} pts
        </span>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <StatLabel>Leader</StatLabel>
          <StatValue color={leaderColor}>{lastPoint.leaderPts} pts</StatValue>
        </div>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <StatLabel>Gap</StatLabel>
          <StatValue color={leaderColor}>
            {currentGap >= 0 ? '+' : ''}{currentGap}
          </StatValue>
        </div>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <StatLabel>Races</StatLabel>
          <StatValue>{totalRaces}</StatValue>
        </div>
      </div>

      {/* Bar chart */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          width="100%"
          height="100%"
          style={{ display: 'block', overflow: 'visible' }}
        >
          {/* Zero-delta reference line */}
          <line
            x1={0}
            y1={MIDLINE}
            x2={VIEW_W}
            y2={MIDLINE}
            stroke="var(--border)"
            strokeWidth={0.75}
            strokeDasharray="3 2"
          />

          {points.map((pt, i) => {
            const isLast = i === numBars - 1
            const prev = i > 0 ? points[i - 1] : null
            // gap increasing → gold, decreasing → red
            const isGrowing = prev == null || pt.delta >= prev.delta
            const baseColor = isGrowing ? 'var(--gold)' : 'var(--red)'
            const barOpacity = isLast ? 1 : 0.65

            // Height: proportion of max delta, mapped to half the chart height
            const barHeight = (Math.abs(pt.delta) / maxDelta) * (MIDLINE - 2)
            // Bars always descend from midline (leader ahead)
            const barY = MIDLINE
            const slotCx = slotW * i + slotW / 2
            const barX = slotCx - barW / 2

            return (
              <g key={pt.round}>
                <rect
                  x={barX}
                  y={barY}
                  width={barW}
                  height={Math.max(barHeight, 0.5)}
                  fill={baseColor}
                  opacity={barOpacity}
                  rx={0.5}
                />
                {/* Highlight cap on last bar */}
                {isLast && (
                  <rect
                    x={barX}
                    y={barY - 1}
                    width={barW}
                    height={2}
                    fill={baseColor}
                    opacity={0.9}
                    rx={0.5}
                  />
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Footer: circuit abbreviations */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          flexShrink: 0,
          overflowX: 'hidden',
        }}
      >
        {points.map((pt) => {
          const abbr = (pt.circuit || `R${pt.round}`).slice(0, 3).toUpperCase()
          const slotPct = (1 / numBars) * 100
          return (
            <div
              key={pt.round}
              style={{
                width: `${slotPct}%`,
                textAlign: 'center',
                fontFamily: 'var(--mono)',
                fontSize: 6,
                color: 'var(--muted2)',
                letterSpacing: '0.04em',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              {abbr}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── shared layout style ───────────────────────────────────────────────────────
const outerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  padding: 9,
  boxSizing: 'border-box',
  gap: 6,
}
