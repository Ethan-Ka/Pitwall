export const HELP = `# Stint Pace Comparison

Plots lap time vs. tyre age for two drivers to compare degradation and raw pace on matching tyre windows.

- **Driver A / Driver B**: Select two drivers to compare using the driver chip pickers.
- **Stint selector**: Choose *Current* (latest stint), *All* (all stints overlaid), or a specific stint number.
- **X axis**: Tyre age in laps (1 = first lap of that tyre set).
- **Y axis**: Lap duration in seconds.
- **Lines**: Each driver's pace profile plotted in their team color.
- **Avg delta**: The mean lap time difference between the two drivers across matched tyre ages.

Unfamiliar terms:

- *Tyre age*: How many laps have been completed on the current set of tyres. Higher age = more worn.
- *Stint*: A continuous run on one set of tyres between pit stops (or from race start to first stop).
- *Tyre window*: The range of tyre ages where both drivers have data — used to compute a fair delta.

Notes: only laps with a recorded duration are plotted. Very short stints (1–2 laps) may not produce a meaningful trend line.
`
import { useLaps } from '../../hooks/useLaps'
import { useRefreshFade } from '../../hooks/useRefreshFade'
import { useStints } from '../../hooks/useStints'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { useDriverStore } from '../../store/driverStore'
import { useWidgetConfig } from '../../hooks/useWidgetConfig'
import { formatLap, formatDelta, type UnitMode } from '../widgetUtils'
import { DriverChipPicker } from '../../components/DriverChipPicker'

interface StintPaceComparisonProps {
  widgetId: string
}
const LIGHT_MUTED = 'color-mix(in srgb, var(--muted) 72%, white)'

interface PacePoint {
  age: number
  duration: number
}

type StintSelection = 'current' | 'all' | `${number}`

interface DriverPaceProfile {
  byAge: Map<number, number>
  label: string
}

function parseDriverNumber(value: unknown): number | null {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

function formatDeltaMagnitude(seconds: number, units: UnitMode): string {
  const abs = Math.abs(seconds)
  if (units === 'ms') return `+${Math.round(abs * 1000)} ms`
  return `+${abs.toFixed(3)}`
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function normalizeStintSelection(value: unknown): StintSelection {
  if (value === 'all') return 'all'
  if (value === 'current') return 'current'
  const asNumber = Number(value)
  if (Number.isInteger(asNumber) && asNumber > 0) return String(asNumber) as `${number}`
  return 'current'
}

function buildStintPacePoints(
  laps: { lap_number: number; lap_duration: number | null }[],
  stint: { lap_start: number; lap_end: number | null; tyre_age_at_start: number }
): PacePoint[] {
  const endLap = stint.lap_end ?? Number.POSITIVE_INFINITY
  return laps
    .filter(
      (lap) =>
        lap.lap_duration != null
        && Number.isFinite(lap.lap_duration)
        && lap.lap_duration > 0
        && lap.lap_number >= stint.lap_start
        && lap.lap_number <= endLap
    )
    .map((lap) => ({
      age: Math.max(1, stint.tyre_age_at_start + (lap.lap_number - stint.lap_start) + 1),
      duration: lap.lap_duration!,
    }))
    .sort((a, b) => a.age - b.age)
}

function getStintNumbersWithValues(
  laps: { lap_number: number; lap_duration: number | null }[] | undefined,
  stints:
    | { stint_number: number; lap_start: number; lap_end: number | null; tyre_age_at_start: number }[]
    | undefined
): number[] {
  if (!laps || !stints) return []
  return [...stints]
    .sort((a, b) => b.stint_number - a.stint_number)
    .filter((stint) => buildStintPacePoints(laps, stint).length > 0)
    .map((stint) => stint.stint_number)
}

function buildDriverPaceProfile(
  laps: { lap_number: number; lap_duration: number | null }[] | undefined,
  stints:
    | { stint_number: number; lap_start: number; lap_end: number | null; tyre_age_at_start: number }[]
    | undefined,
  selection: StintSelection
): DriverPaceProfile {
  if (!laps || !stints || stints.length === 0) {
    return { byAge: new Map(), label: 'Stint —' }
  }

  const sortedStints = [...stints].sort((a, b) => b.stint_number - a.stint_number)

  let selectedStints = sortedStints
  let label = 'All stints'
  if (selection === 'current') {
    selectedStints = sortedStints.slice(0, 1)
    label = `Stint ${selectedStints[0].stint_number}`
  } else if (selection !== 'all') {
    const match = sortedStints.find((stint) => stint.stint_number === Number(selection))
    selectedStints = match ? [match] : []
    label = match ? `Stint ${match.stint_number}` : 'Stint —'
  }

  const groupedByAge = new Map<number, number[]>()
  for (const stint of selectedStints) {
    const points = buildStintPacePoints(laps, stint)
    for (const point of points) {
      const list = groupedByAge.get(point.age) ?? []
      list.push(point.duration)
      groupedByAge.set(point.age, list)
    }
  }

  const byAge = new Map<number, number>()
  for (const [age, samples] of groupedByAge.entries()) {
    const avg = average(samples)
    if (avg != null) byAge.set(age, avg)
  }

  return { byAge, label }
}

export function StintPaceComparison({ widgetId }: StintPaceComparisonProps) {
  const tabId = useWorkspaceStore((s) => {
    for (const tab of s.tabs) {
      if (tab.widgets[widgetId]) return tab.id
    }
    return null
  })
  const updateWidgetConfig = useWorkspaceStore((s) => s.updateWidgetConfig)
  const config = useWidgetConfig(widgetId)

  const units: UnitMode = (config?.settings?.units as UnitMode) ?? 's'
  const leftDriverNumber = parseDriverNumber(config?.settings?.leftDriverNumber)
  const rightDriverNumber = parseDriverNumber(config?.settings?.rightDriverNumber)
  const leftStintSelection = normalizeStintSelection(config?.settings?.leftStintSelection)
  const rightStintSelection = normalizeStintSelection(config?.settings?.rightStintSelection)
  const drivers = useDriverStore((s) => s.drivers)
  const getDriver = useDriverStore((s) => s.getDriver)
  const getTeamColor = useDriverStore((s) => s.getTeamColor)

  function updateSetting(
    key: 'leftDriverNumber' | 'rightDriverNumber' | 'leftStintSelection' | 'rightStintSelection',
    value: string
  ) {
    if (!tabId || !config) return
    const nextValue =
      key === 'leftDriverNumber' || key === 'rightDriverNumber'
        ? value === ''
          ? null
          : Number(value)
        : value

    updateWidgetConfig(tabId, widgetId, {
      settings: {
        ...config.settings,
        [key]: nextValue,
      },
    })
  }

  const driverOptions = [...drivers]
    .sort((a, b) => a.driver_number - b.driver_number)
    .map((d) => ({ driver_number: d.driver_number, name_acronym: d.name_acronym, teamColor: getTeamColor(d.driver_number) }))

  const { data: leftStints } = useStints(leftDriverNumber ?? undefined)
  const { data: rightStints } = useStints(rightDriverNumber ?? undefined)
  const { data: leftLaps } = useLaps(leftDriverNumber ?? undefined)
  const { data: rightLaps } = useLaps(rightDriverNumber ?? undefined)

  const refreshFade = useRefreshFade([
    leftDriverNumber,
    rightDriverNumber,
    leftStints,
    rightStints,
    leftLaps,
    rightLaps,
  ])

  const hasBothDrivers = leftDriverNumber != null && rightDriverNumber != null
  const duplicateSelection = hasBothDrivers && leftDriverNumber === rightDriverNumber

  const leftStintOptions = getStintNumbersWithValues(leftLaps, leftStints)
  const rightStintOptions = getStintNumbersWithValues(rightLaps, rightStints)

  const leftProfile = buildDriverPaceProfile(leftLaps, leftStints, leftStintSelection)
  const rightProfile = buildDriverPaceProfile(rightLaps, rightStints, rightStintSelection)
  const hasBothStints = leftProfile.byAge.size > 0 && rightProfile.byAge.size > 0

  const leftByAge = leftProfile.byAge
  const rightByAge = rightProfile.byAge

  const sharedAges = [...leftByAge.keys()]
    .filter((age) => rightByAge.has(age))
    .sort((a, b) => a - b)

  const leftAvg = average(sharedAges.map((age) => leftByAge.get(age)!))
  const rightAvg = average(sharedAges.map((age) => rightByAge.get(age)!))
  const hasAverages = leftAvg != null && rightAvg != null

  const ready = hasBothDrivers && !duplicateSelection && hasBothStints && sharedAges.length > 0 && hasAverages

  let statusMessage = 'Select both drivers'
  if (duplicateSelection) {
    statusMessage = 'Choose two different drivers'
  } else if (hasBothDrivers && !hasBothStints) {
    statusMessage = 'Waiting for stint data'
  } else if (hasBothDrivers && hasBothStints && sharedAges.length === 0) {
    statusMessage = 'No shared tyre-age window'
  }

  const detailAges = ready ? sharedAges.slice(-6) : []
  const rowData = detailAges.map((age) => {
    const left = leftByAge.get(age)!
    const right = rightByAge.get(age)!
    return {
      age,
      left,
      right,
      delta: right - left,
    }
  })

  const leftDriverInfo = leftDriverNumber != null ? getDriver(leftDriverNumber) : undefined
  const rightDriverInfo = rightDriverNumber != null ? getDriver(rightDriverNumber) : undefined
  const leftName = leftDriverInfo?.name_acronym ?? (leftDriverNumber != null ? `#${leftDriverNumber}` : 'Driver A')
  const rightName = rightDriverInfo?.name_acronym ?? (rightDriverNumber != null ? `#${rightDriverNumber}` : 'Driver B')
  const leftColor = leftDriverNumber != null ? getTeamColor(leftDriverNumber) : 'var(--muted2)'
  const rightColor = rightDriverNumber != null ? getTeamColor(rightDriverNumber) : 'var(--muted2)'

  const avgDelta = ready ? rightAvg! - leftAvg! : null
  const avgLeadLabel = avgDelta == null
    ? statusMessage
    : Math.abs(avgDelta) < 0.0005
      ? 'Even pace'
      : avgDelta > 0
        ? `${leftName} faster by ${formatDeltaMagnitude(avgDelta, units)}`
        : `${rightName} faster by ${formatDeltaMagnitude(avgDelta, units)}`
  const avgLeadColor = avgDelta == null
    ? LIGHT_MUTED
    : Math.abs(avgDelta) < 0.0005
      ? LIGHT_MUTED
      : avgDelta > 0
        ? leftColor
        : rightColor

  const visibleRows = ready
    ? rowData
    : Array.from({ length: 6 }, (_, idx) => ({
        age: idx + 1,
        left: null,
        right: null,
        delta: null,
      }))

  const rowContainerMaxHeight = Math.max(1, visibleRows.length) * 28

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
      {/* Comparison header: Driver A [vs] Driver B with stint selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'start', gap: 6 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <DriverChipPicker
            value={leftDriverNumber}
            options={driverOptions}
            onChange={(n) => updateSetting('leftDriverNumber', n == null ? '' : String(n))}
            align="left"
            placeholder="Driver A"
          />
          <StintSelector
            value={leftStintSelection}
            options={leftStintOptions}
            onChange={(nextValue) => updateSetting('leftStintSelection', nextValue)}
          />
        </div>

        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 7,
            color: 'var(--muted2)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            textAlign: 'center',
            paddingTop: 7,
          }}
        >
          vs
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <DriverChipPicker
            value={rightDriverNumber}
            options={driverOptions}
            onChange={(n) => updateSetting('rightDriverNumber', n == null ? '' : String(n))}
            align="right"
            placeholder="Driver B"
          />
          <StintSelector
            value={rightStintSelection}
            options={rightStintOptions}
            onChange={(nextValue) => updateSetting('rightStintSelection', nextValue)}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'end', gap: 10 }}>
        <DriverPill
          name={leftName}
          color={leftColor}
          caption={leftProfile.label}
          align="left"
        />
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 7,
            color: 'var(--muted2)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            textAlign: 'center',
            paddingBottom: 2,
          }}
        />
        <DriverPill
          name={rightName}
          color={rightColor}
          caption={rightProfile.label}
          align="right"
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 8,
          alignItems: 'center',
          padding: '7px 8px',
          borderRadius: 3,
          border: '0.5px solid var(--border)',
          background: 'linear-gradient(180deg, var(--bg4) 0%, var(--bg3) 100%)',
        }}
      >
        <span style={{ fontFamily: 'var(--cond)', fontSize: 18, color: leftColor, lineHeight: 1 }}>
          {ready ? formatLap(leftAvg!, units) : '—'}
        </span>
        <div style={{ textAlign: 'center' }}>
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
            Avg ({ready ? sharedAges.length : '—'} laps)
          </div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 8,
              color: avgLeadColor,
            }}
          >
            {avgLeadLabel}
          </div>
        </div>
        <span style={{ fontFamily: 'var(--cond)', fontSize: 18, color: rightColor, lineHeight: 1, textAlign: 'right' }}>
          {ready ? formatLap(rightAvg!, units) : '—'}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 4,
          maxHeight: rowContainerMaxHeight,
          overflow: 'hidden',
        }}
      >
        {visibleRows.map((row) => {
          if (row.left == null || row.right == null || row.delta == null) {
            return (
              <div
                key={`placeholder-${row.age}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '34px 1fr 58px 1fr',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--muted2)' }}>TYRE AGE —L</span>

                <PlaceholderBarCell align="left" />

                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 8,
                    color: 'var(--muted2)',
                    textAlign: 'center',
                  }}
                >
                  —
                </span>

                <PlaceholderBarCell align="right" />
              </div>
            )
          }

          const max = Math.max(row.left, row.right)
          const safeMax = max > 0 ? max : 1
          const leftPct = (row.left / safeMax) * 100
          const rightPct = (row.right / safeMax) * 100
          const leftFaster = row.left <= row.right

          return (
            <div
              key={row.age}
              style={{
                display: 'grid',
                gridTemplateColumns: '34px 1fr 58px 1fr',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--muted2)' }}>TYRE AGE {row.age}L</span>

              <BarCell
                value={row.left}
                widthPct={leftPct}
                color={leftColor}
                align="left"
                highlight={leftFaster}
                units={units}
              />

              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 8,
                  color: row.delta > 0 ? 'var(--green)' : row.delta < 0 ? 'var(--amber)' : LIGHT_MUTED,
                  textAlign: 'center',
                }}
              >
                {Math.abs(row.delta) < 0.0005 ? 'EVEN' : formatDelta(row.delta, units)}
              </span>

              <BarCell
                value={row.right}
                widthPct={rightPct}
                color={rightColor}
                align="right"
                highlight={!leftFaster}
                units={units}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StintSelector({
  value,
  options,
  onChange,
}: {
  value: StintSelection
  options: number[]
  onChange: (value: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      style={{
        width: '100%',
        background: 'var(--bg4)',
        color: 'var(--muted)',
        border: '0.5px solid var(--border)',
        borderRadius: 3,
        height: 20,
        padding: '0 6px',
        fontFamily: 'var(--mono)',
        fontSize: 9,
      }}
    >
      <option value="current">Current stint</option>
      <option value="all">All stints</option>
      {options.map((stintNumber) => (
        <option key={stintNumber} value={stintNumber}>
          Stint {stintNumber}
        </option>
      ))}
    </select>
  )
}

function DriverPill({
  name,
  color,
  caption,
  align,
}: {
  name: string
  color: string
  caption: string
  align: 'left' | 'right'
}) {
  return (
    <div style={{ textAlign: align }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: align === 'left' ? 'flex-start' : 'flex-end' }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: color, boxShadow: `0 0 6px ${color}66` }} />
        <span style={{ fontFamily: 'var(--cond)', fontSize: 14, fontWeight: 700, color: 'var(--white)', lineHeight: 1 }}>
          {name}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--muted2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 3 }}>
        {caption}
      </div>
    </div>
  )
}

function BarCell({
  value,
  widthPct,
  color,
  align,
  highlight,
  units,
}: {
  value: number
  widthPct: number
  color: string
  align: 'left' | 'right'
  highlight: boolean
  units: UnitMode
}) {
  return (
    <div style={{ display: 'grid', gap: 2 }}>
      <div style={{ height: 6, borderRadius: 999, border: '0.5px solid var(--border)', background: 'var(--bg)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.max(12, widthPct)}%`,
            height: '100%',
            marginLeft: align === 'right' ? 'auto' : 0,
            background: highlight ? color : 'color-mix(in srgb, var(--muted) 60%, transparent)',
          }}
        />
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: highlight ? 'var(--white)' : LIGHT_MUTED, textAlign: align }}>
        {formatLap(value, units)}
      </span>
    </div>
  )
}

function PlaceholderBarCell({ align }: { align: 'left' | 'right' }) {
  return (
    <div
      style={{
        display: 'grid',
        gap: 2,
      }}
    >
      <div style={{ height: 6, borderRadius: 999, border: '0.5px solid var(--border)', background: 'var(--bg)', opacity: 0.45 }} />
      <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--muted2)', textAlign: align }}>—</span>
    </div>
  )
}
