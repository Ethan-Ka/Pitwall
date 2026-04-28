import { useRef, useEffect, useMemo, useState } from 'react'
import { useLocation } from '../../hooks/useLocation'
import { useCircuitMap } from '../../hooks/useCircuitMap'
import { useDriverStore } from '../../store/driverStore'
import { useSessionStore } from '../../store/sessionStore'
import { useRefreshFade } from '../../hooks/useRefreshFade'

// ---------------------------------------------------------------------------
// Coordinate helpers (module scope — stable across renders)
// ---------------------------------------------------------------------------

function makeNormalizer(
  bbox: { minX: number; maxX: number; minY: number; maxY: number },
  svgW: number,
  svgH: number,
  pad = 20,
) {
  const rangeX = bbox.maxX - bbox.minX || 1
  const rangeY = bbox.maxY - bbox.minY || 1
  const scale = Math.min((svgW - pad * 2) / rangeX, (svgH - pad * 2) / rangeY)
  const offX = pad + ((svgW - pad * 2) - rangeX * scale) / 2
  const offY = pad + ((svgH - pad * 2) - rangeY * scale) / 2
  return {
    toSVG: (x: number, y: number) => ({
      svgX: offX + (x - bbox.minX) * scale,
      // Flip Y axis: FastF1 Y increases upward, SVG Y increases downward
      svgY: svgH - (offY + (y - bbox.minY) * scale),
    }),
    scale,
  }
}

function bboxFromPoints(pts: { x: number; y: number }[]) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of pts) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  return { minX, maxX, minY, maxY }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FullTrackMap({ widgetId: _ }: { widgetId: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 300, height: 260 })
  const [hoveredDriver, setHoveredDriver] = useState<number | null>(null)

  const f1Ref = useSessionStore((s) => s.activeFastF1Session)
  const { data: driverPositions, trackPoints } = useLocation()
  const { data: circuitMap } = useCircuitMap(f1Ref)
  const getDriver = useDriverStore((s) => s.getDriver)
  const getTeamColor = useDriverStore((s) => s.getTeamColor)
  const refreshFade = useRefreshFade([driverPositions])

  // Observe container size changes
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setSize({ width: Math.max(120, width), height: Math.max(100, height) })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Decide which track data source to use for normalization bbox
  const bbox = useMemo(() => {
    if (circuitMap) return circuitMap.bbox
    if (trackPoints.length > 50) return bboxFromPoints(trackPoints)
    return null
  }, [circuitMap, trackPoints])

  const normalizer = useMemo(
    () => (bbox ? makeNormalizer(bbox, size.width, size.height) : null),
    [bbox, size],
  )

  // Build SVG polyline string for the circuit outline
  const trackPolyline = useMemo(() => {
    if (!normalizer) return ''
    const pts = circuitMap
      ? circuitMap.x.map((x, i) => normalizer.toSVG(x, circuitMap.y[i]))
      : trackPoints.map((p) => normalizer.toSVG(p.x, p.y))
    return pts.map((p) => `${p.svgX.toFixed(1)},${p.svgY.toFixed(1)}`).join(' ')
  }, [circuitMap, trackPoints, normalizer])

  // Project driver dots into SVG space
  const dots = useMemo(() => {
    if (!normalizer || !driverPositions) return []
    return driverPositions.map((dp) => {
      const { svgX, svgY } = normalizer.toSVG(dp.x, dp.y)
      const driver = getDriver(dp.driverNumber)
      return {
        driverNumber: dp.driverNumber,
        abbr: driver?.name_acronym ?? `${dp.driverNumber}`,
        color: getTeamColor(dp.driverNumber),
        svgX,
        svgY,
        metricX: dp.x,
        metricY: dp.y,
      }
    })
  }, [driverPositions, normalizer, getDriver, getTeamColor])

  // Battle proximity — Euclidean distance in metric space < 30 m
  const battleSet = useMemo(() => {
    const set = new Set<number>()
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const dist = Math.hypot(
          dots[i].metricX - dots[j].metricX,
          dots[i].metricY - dots[j].metricY,
        )
        if (dist < 30) {
          set.add(dots[i].driverNumber)
          set.add(dots[j].driverNumber)
        }
      }
    }
    return set
  }, [dots])

  const hasData = dots.length > 0
  const hasOutline = trackPolyline.length > 0
  const buildingTrack = !hasOutline && !circuitMap

  return (
    <div
      ref={containerRef}
      className={refreshFade ? 'data-refresh-fade' : undefined}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
    >
      <svg width={size.width} height={size.height} style={{ display: 'block' }}>
        {/* Track outline — thick band for road surface feel */}
        {hasOutline && (
          <polyline
            points={trackPolyline}
            fill="none"
            stroke="var(--border2)"
            strokeWidth={14}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {/* Track outline — thin centre line for definition */}
        {hasOutline && (
          <polyline
            points={trackPolyline}
            fill="none"
            stroke="var(--border3)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Battle proximity rings */}
        {dots.filter((d) => battleSet.has(d.driverNumber)).map((d) => (
          <circle
            key={`battle-${d.driverNumber}`}
            cx={d.svgX}
            cy={d.svgY}
            r={10}
            fill="none"
            stroke="var(--amber)"
            strokeWidth={0.8}
            strokeDasharray="3 2"
            opacity={0.7}
          />
        ))}

        {/* Driver dots + abbreviation labels */}
        {dots.map((d) => {
          const isHovered = hoveredDriver === d.driverNumber
          return (
            <g key={d.driverNumber}>
              <circle
                cx={d.svgX}
                cy={d.svgY}
                r={isHovered ? 8 : 5}
                fill={d.color}
                style={{
                  filter: `drop-shadow(0 0 4px ${d.color}99)`,
                  cursor: 'pointer',
                  transition: 'r 0.15s',
                }}
                onMouseEnter={() => setHoveredDriver(d.driverNumber)}
                onMouseLeave={() => setHoveredDriver(null)}
              />
              {/* Labels always visible; full opacity on hover */}
              <text
                x={d.svgX}
                y={d.svgY - 9}
                textAnchor="middle"
                fontFamily="var(--mono)"
                fontSize={7}
                fill={isHovered ? 'var(--white)' : `${d.color}cc`}
                letterSpacing="0.06em"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {d.abbr}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Overlay when no position data yet */}
      {!hasData && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--mono)',
            fontSize: 9,
            color: 'var(--muted2)',
          }}
        >
          {buildingTrack ? 'Building track map…' : 'Waiting for position data…'}
        </div>
      )}
    </div>
  )
}
