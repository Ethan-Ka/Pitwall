import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useIntervalHistory } from '../../hooks/useIntervals'
import { useWidgetConfig } from '../../hooks/useWidgetConfig'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { useDriverStore } from '../../store/driverStore'
import { useRefreshFade } from '../../hooks/useRefreshFade'
import { EmptyState } from '../widgetUtils'
import { PitwallTooltip, CHART_COLORS, CHART_AXIS_TICK, CHART_MARGINS } from '../chartUtils'
import { DriverChipPicker } from '../../components/DriverChipPicker'
import type { OpenF1Interval } from '../../api/openf1'

interface GapPoint {
  t: number
  a: number | undefined
  b: number | undefined
}

function parseDriverNumber(value: unknown): number | null {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

function buildGapSeries(intervals: OpenF1Interval[], driverA: number, driverB: number): GapPoint[] {
  const BUCKET_SECS = 60

  const aRows = intervals.filter((r) => r.driver_number === driverA).sort((x, y) => x.date.localeCompare(y.date))
  const bRows = intervals.filter((r) => r.driver_number === driverB).sort((x, y) => x.date.localeCompare(y.date))
  if (aRows.length === 0 && bRows.length === 0) return []

  const allTimes = [...aRows, ...bRows].map((r) => new Date(r.date).getTime())
  const sessionStart = Math.min(...allTimes)

  const buckets = new Map<number, { a?: number; b?: number }>()

  for (const r of aRows) {
    if (r.gap_to_leader == null) continue
    const bucket = Math.floor((new Date(r.date).getTime() - sessionStart) / 1000 / BUCKET_SECS)
    buckets.set(bucket, { ...buckets.get(bucket), a: r.gap_to_leader })
  }
  for (const r of bRows) {
    if (r.gap_to_leader == null) continue
    const bucket = Math.floor((new Date(r.date).getTime() - sessionStart) / 1000 / BUCKET_SECS)
    buckets.set(bucket, { ...buckets.get(bucket), b: r.gap_to_leader })
  }

  return [...buckets.entries()]
    .sort(([x], [y]) => x - y)
    .map(([bucket, vals]) => ({
      t: +(bucket * BUCKET_SECS / 60).toFixed(1),
      a: vals.a,
      b: vals.b,
    }))
}

function getLatestGap(intervals: OpenF1Interval[] | undefined, driverNumber: number): number | null {
  if (!intervals) return null
  const rows = intervals.filter((r) => r.driver_number === driverNumber && r.gap_to_leader != null)
  if (rows.length === 0) return null
  return rows.reduce((latest, r) => (r.date > latest.date ? r : latest)).gap_to_leader
}

export function GapEvolutionChart({ widgetId }: { widgetId: string }) {
  const tabId = useWorkspaceStore((s) => {
    for (const tab of s.tabs) {
      if (tab.widgets[widgetId]) return tab.id
    }
    return null
  })
  const updateWidgetConfig = useWorkspaceStore((s) => s.updateWidgetConfig)
  const config = useWidgetConfig(widgetId)

  const driverA = parseDriverNumber(config?.settings?.driverA)
  const driverB = parseDriverNumber(config?.settings?.driverB)

  const drivers = useDriverStore((s) => s.drivers)
  const getDriver = useDriverStore((s) => s.getDriver)
  const getTeamColor = useDriverStore((s) => s.getTeamColor)
  const { data: intervals } = useIntervalHistory()

  const refreshFade = useRefreshFade([intervals, driverA, driverB])

  const chartData = useMemo(() => {
    if (!intervals || driverA == null || driverB == null) return []
    return buildGapSeries(intervals, driverA, driverB)
  }, [intervals, driverA, driverB])

  const colorA = driverA != null ? getTeamColor(driverA) : '#6B6B70'
  const colorB = driverB != null ? getTeamColor(driverB) : '#858590'
  const infoA = driverA != null ? getDriver(driverA) : undefined
  const infoB = driverB != null ? getDriver(driverB) : undefined
  const nameA = infoA?.name_acronym ?? (driverA != null ? `#${driverA}` : '—')
  const nameB = infoB?.name_acronym ?? (driverB != null ? `#${driverB}` : '—')

  const latestA = getLatestGap(intervals, driverA ?? -1)
  const latestB = getLatestGap(intervals, driverB ?? -1)

  function updateDriver(key: 'driverA' | 'driverB', value: string) {
    if (!tabId || !config) return
    updateWidgetConfig(tabId, widgetId, {
      settings: {
        ...config.settings,
        [key]: value === '' ? null : Number(value),
      },
    })
  }

  const hasBoth = driverA != null && driverB != null
  const hasData = chartData.length > 0

  const driverOptions = [...drivers]
    .sort((a, b) => a.driver_number - b.driver_number)
    .map((d) => ({ driver_number: d.driver_number, name_acronym: d.name_acronym, teamColor: getTeamColor(d.driver_number) }))

  return (
    <div
      className={refreshFade ? 'data-refresh-fade' : undefined}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: 9,
        boxSizing: 'border-box',
        gap: 7,
      }}
    >
      {/* Comparison header: Driver A [vs] Driver B */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <DriverChipPicker
          value={driverA}
          options={driverOptions}
          onChange={(n) => updateDriver('driverA', n == null ? '' : String(n))}
          align="left"
          placeholder="Driver A"
        />
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 7,
            color: 'var(--muted2)',
            letterSpacing: '0.1em',
            flexShrink: 0,
            textTransform: 'uppercase',
          }}
        >
          vs
        </span>
        <DriverChipPicker
          value={driverB}
          options={driverOptions}
          onChange={(n) => updateDriver('driverB', n == null ? '' : String(n))}
          align="right"
          placeholder="Driver B"
        />
      </div>

      {hasBoth && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <DriverPill name={nameA} color={colorA} gap={latestA} align="left" />
          <DriverPill name={nameB} color={colorB} gap={latestB} align="right" />
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0 }}>
        {!hasBoth ? (
          <EmptyState message="Select two drivers" />
        ) : !hasData ? (
          <EmptyState message="Waiting for interval data" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={CHART_MARGINS}>
              <defs>
                <linearGradient id={`gapGradA-${widgetId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colorA} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={colorA} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id={`gapGradB-${widgetId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colorB} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={colorB} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                domain={['dataMin', 'dataMax']}
                tick={CHART_AXIS_TICK}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}m`}
              />
              <YAxis
                tick={CHART_AXIS_TICK}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `+${v.toFixed(0)}s`}
                width={36}
                domain={[0, 'auto']}
              />
              <Tooltip
                content={
                  <PitwallTooltip
                    formatValue={(v) => `+${v.toFixed(3)}s`}
                    formatLabel={(t) => `${t.toFixed(1)} min`}
                  />
                }
                cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="a"
                stroke={colorA}
                strokeWidth={1.5}
                fill={`url(#gapGradA-${widgetId})`}
                dot={false}
                connectNulls
                name={nameA}
              />
              <Area
                type="monotone"
                dataKey="b"
                stroke={colorB}
                strokeWidth={1.5}
                fill={`url(#gapGradB-${widgetId})`}
                dot={false}
                connectNulls
                name={nameB}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function DriverPill({
  name,
  color,
  gap,
  align,
}: {
  name: string
  color: string
  gap: number | null
  align: 'left' | 'right'
}) {
  return (
    <div style={{ textAlign: align }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          justifyContent: align === 'left' ? 'flex-start' : 'flex-end',
        }}
      >
        <div style={{ width: 3, height: 14, borderRadius: 2, background: color, boxShadow: `0 0 6px ${color}66` }} />
        <span style={{ fontFamily: 'var(--cond)', fontSize: 14, fontWeight: 700, color: 'var(--white)', lineHeight: 1 }}>
          {name}
        </span>
      </div>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 8,
          color: gap != null ? color : 'var(--muted2)',
          marginTop: 2,
          textAlign: align,
        }}
      >
        {gap != null ? (gap === 0 ? 'LEADER' : `+${gap.toFixed(3)}s`) : '—'}
      </div>
    </div>
  )
}
