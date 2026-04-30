export const HELP = `# Track Temp Evolution

Area chart of track and air temperature over the session, useful for identifying when conditions are improving or degrading.

- **Track temp** (orange/amber area): Temperature of the asphalt surface at each weather poll.
- **Air temp** (blue line): Ambient air temperature — toggled on/off via the toggle button.
- **X axis**: Time through the session (session-relative minutes or UTC time, depending on data).
- **Hover tooltip**: Shows exact temperatures at each sampled point.

Unfamiliar terms:

- *Track temperature*: How hot the track surface is. A hotter track provides more grip up to a point, but can also degrade tyres faster. Teams use track temperature when modelling tyre behaviour.
- *Rubber*: As more laps are completed, tyre rubber builds up on the racing line, increasing grip — this effect is often seen when track temp stabilises but lap times improve.

Notes: temperature data is sampled at the same rate as the weather polling interval. The evolution chart is only meaningful once several data points have accumulated — early in a session it may show only one or two readings.
`
import { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useWeather } from '../../hooks/useWeather'
import { useRefreshFade } from '../../hooks/useRefreshFade'
import { EmptyState } from '../widgetUtils'
import { PitwallTooltip, CHART_COLORS, CHART_AXIS_TICK, CHART_MARGINS } from '../chartUtils'
import type { OpenF1Weather } from '../../api/openf1'

const COLOR_TRACK = '#E09000'  // amber — hot surface
const COLOR_AIR   = '#3671C6'  // blue — ambient air

interface TempPoint {
  t: number
  track: number
  air: number
}

function buildTempSeries(weather: OpenF1Weather[]): TempPoint[] {
  const sorted = [...weather].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length === 0) return []
  const sessionStart = new Date(sorted[0].date).getTime()
  return sorted.map((w) => ({
    t: +((new Date(w.date).getTime() - sessionStart) / 60_000).toFixed(1),
    track: w.track_temperature,
    air: w.air_temperature,
  }))
}

export function TrackTempEvolution({ widgetId }: { widgetId: string }) {
  const { data: weatherHistory } = useWeather()
  const [showAir, setShowAir] = useState(true)

  const refreshFade = useRefreshFade([weatherHistory])

  const chartData = useMemo(() => {
    if (!weatherHistory || weatherHistory.length === 0) return []
    return buildTempSeries(weatherHistory)
  }, [weatherHistory])

  const latest = chartData.at(-1)
  const hasData = chartData.length > 0

  const trackDelta = chartData.length >= 2
    ? latest!.track - chartData[0].track
    : null
  const airDelta = chartData.length >= 2
    ? latest!.air - chartData[0].air
    : null

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
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <TempStat
            label="Track"
            value={latest?.track ?? null}
            delta={trackDelta}
            color={COLOR_TRACK}
          />
          <TempStat
            label="Air"
            value={latest?.air ?? null}
            delta={airDelta}
            color={COLOR_AIR}
          />
        </div>

        <button
          onClick={() => setShowAir((v) => !v)}
          style={{
            background: showAir ? 'rgba(54,113,198,0.15)' : 'transparent',
            border: `0.5px solid ${showAir ? COLOR_AIR : 'var(--border)'}`,
            borderRadius: 3,
            padding: '3px 7px',
            fontFamily: 'var(--mono)',
            fontSize: 8,
            color: showAir ? COLOR_AIR : 'var(--muted2)',
            cursor: 'pointer',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Air
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {!hasData ? (
          <EmptyState message="Waiting for weather data" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={CHART_MARGINS}>
              <defs>
                <linearGradient id={`trackGrad-${widgetId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLOR_TRACK} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLOR_TRACK} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id={`airGrad-${widgetId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLOR_AIR} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={COLOR_AIR} stopOpacity={0.02} />
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
                tickFormatter={(v: number) => `${v}°`}
                width={30}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={
                  <PitwallTooltip
                    formatValue={(v) => `${v.toFixed(1)}°C`}
                    formatLabel={(t) => `${t.toFixed(1)} min`}
                  />
                }
                cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="track"
                stroke={COLOR_TRACK}
                strokeWidth={1.5}
                fill={`url(#trackGrad-${widgetId})`}
                dot={false}
                name="Track"
              />
              {showAir && (
                <Area
                  type="monotone"
                  dataKey="air"
                  stroke={COLOR_AIR}
                  strokeWidth={1.5}
                  fill={`url(#airGrad-${widgetId})`}
                  dot={false}
                  name="Air"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function TempStat({
  label,
  value,
  delta,
  color,
}: {
  label: string
  value: number | null
  delta: number | null
  color: string
}) {
  const sign = delta != null && delta > 0 ? '+' : ''
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 7,
          color: 'var(--muted2)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={{ fontFamily: 'var(--cond)', fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>
          {value != null ? `${value.toFixed(1)}°` : '—'}
        </span>
        {delta != null && (
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 8,
              color: delta > 0 ? '#E09000' : delta < 0 ? '#3671C6' : 'var(--muted2)',
            }}
          >
            {sign}{delta.toFixed(1)}°
          </span>
        )}
      </div>
    </div>
  )
}
