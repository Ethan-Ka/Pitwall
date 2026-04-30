export const HELP = `# Full Track Map

Displays a detailed map of the current circuit, including layout and key features.

- **Track outline**: Shows the full circuit layout to scale.
- **Driver positions**: May overlay live driver locations if data is available.
- **Zoom/pan**: Some maps support zooming or panning for detail.

**Tips:**
- Use to understand circuit shape, sector locations, and overtaking zones.
- Useful for commentary, analysis, or situational awareness.

**Notes:**
- Map detail and accuracy depend on available circuit data.
- If no circuit is selected or data is missing, the widget may show an empty state.

**Unfamiliar terms:**
- *Sector*: A section of the track used for timing splits (S1, S2, S3).
- *Track outline*: The path of the racing circuit.
`
import { useRef, useEffect, useMemo, useState } from 'react'
import { useLocation } from '../../hooks/useLocation'
import { useCircuitMap } from '../../hooks/useCircuitMap'
import { useTrackDisplayAsset } from '../../hooks/useTrackDisplayAsset'
import { useDriverStore } from '../../store/driverStore'
import { useSessionStore } from '../../store/sessionStore'
import { useRefreshFade } from '../../hooks/useRefreshFade'
import { useFakeTelemetryStore } from '../../store/fakeTelemetryStore'
import { MELBOURNE_CIRCUIT_MAP } from '../../data/melbourneCircuitMap'
import { makeNormalizer, bboxFromPoints } from '../../lib/trackNormalizer'

export function FullTrackMap({ widgetId: _ }: { widgetId: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 300, height: 260 })
  const [hoveredDriver, setHoveredDriver] = useState<number | null>(null)

  const f1Ref = useSessionStore((s) => s.activeFastF1Session)
  const activeSession = useSessionStore((s) => s.activeSession)
  const fakeEnabled = useFakeTelemetryStore((s) => s.enabled)
  const { data: driverPositions, trackPoints } = useLocation()
  const { data: circuitMap } = useCircuitMap(fakeEnabled ? f1Ref : null)

  const fakeNoSession = fakeEnabled && !f1Ref && !activeSession
  const assetYear = activeSession?.year ?? (fakeNoSession ? 2026 : (f1Ref?.year ?? null))
  const assetRound = activeSession != null ? null : (fakeNoSession ? 1 : (f1Ref?.round ?? null))
  const assetCircuit = assetRound == null ? (activeSession?.circuit_short_name ?? null) : null
  const { data: displayAsset } = useTrackDisplayAsset(assetYear, assetRound, assetCircuit)

  const staticSvgUrl = displayAsset?.url ?? null
  const displayRotation = displayAsset?.displayRotation ?? 0

  const effectiveCircuitMap = fakeEnabled
    ? (circuitMap ?? MELBOURNE_CIRCUIT_MAP)
    : null
  const getDriver = useDriverStore((s) => s.getDriver)
  const getTeamColor = useDriverStore((s) => s.getTeamColor)
  const refreshFade = useRefreshFade([driverPositions])

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setSize({ width: Math.max(120, width), height: Math.max(100, height) })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const bbox = useMemo(() => {
    if (effectiveCircuitMap) return effectiveCircuitMap.bbox
    if (trackPoints.length > 3) return bboxFromPoints(trackPoints)
    return null
  }, [effectiveCircuitMap, trackPoints])

  const normalizer = useMemo(
    () => (bbox ? makeNormalizer(bbox, size.width, size.height) : null),
    [bbox, size],
  )

  const trackPolyline = useMemo(() => {
    if (!normalizer) return ''
    if (!effectiveCircuitMap && trackPoints.length < 50) return ''
    const pts = effectiveCircuitMap
      ? effectiveCircuitMap.x.map((x, i) => normalizer.toSVG(x, effectiveCircuitMap.y[i]))
      : trackPoints.map((p) => normalizer.toSVG(p.x, p.y))
    return pts.map((p) => `${p.svgX.toFixed(1)},${p.svgY.toFixed(1)}`).join(' ')
  }, [effectiveCircuitMap, trackPoints, normalizer])

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
  const buildingTrack = !hasOutline && !effectiveCircuitMap
  const showStaticAsset = buildingTrack && !!staticSvgUrl

  const cx = size.width / 2
  const cy = size.height / 2

  return (
    <div
      ref={containerRef}
      className={refreshFade ? 'data-refresh-fade' : undefined}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
    >
      <svg width={size.width} height={size.height} style={{ display: 'block' }}>
        {/* Static circuit asset — rotated to align with circuit-coordinate orientation */}
        {showStaticAsset && (
          <image
            href={staticSvgUrl!}
            x={0}
            y={0}
            width={size.width}
            height={size.height}
            preserveAspectRatio="xMidYMid meet"
            opacity={0.35}
            transform={displayRotation !== 0 ? `rotate(${displayRotation}, ${cx}, ${cy})` : undefined}
          />
        )}

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

      {!hasData && !showStaticAsset && (
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
