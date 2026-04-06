import { useLaps } from '../../hooks/useLaps'
import { useRefreshFade } from '../../hooks/useRefreshFade'
import { useStints } from '../../hooks/useStints'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { useDriverStore } from '../../store/driverStore'

interface StintPaceComparisonProps {
  widgetId: string
}

type UnitMode = 's' | 'ms'
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

function formatDuration(seconds: number, units: UnitMode): string {
  if (units === 'ms') return `${Math.round(seconds * 1000)} ms`
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60)
    const remainder = (seconds % 60).toFixed(3).padStart(6, '0')
    return `${minutes}:${remainder}`
  }
  return seconds.toFixed(3)
}

function formatDelta(seconds: number, units: UnitMode): string {
  const sign = seconds > 0 ? '+' : '-'
  const abs = Math.abs(seconds)
  if (units === 'ms') return `${sign}${Math.round(abs * 1000)} ms`
  return `${sign}${abs.toFixed(3)}`
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
  const tabs = useWorkspaceStore((s) => s.tabs)
  const updateWidgetConfig = useWorkspaceStore((s) => s.updateWidgetConfig)

  let tabId: string | null = null
  let config = undefined as ReturnType<typeof useWorkspaceStore.getState>['tabs'][0]['widgets'][string] | undefined
  for (const tab of tabs) {
    if (tab.widgets[widgetId]) {
      tabId = tab.id
      config = tab.widgets[widgetId]
      break
    }
  }

  const units: UnitMode = (config?.settings?.units as UnitMode) ?? 's'
  const leftDriverNumber = parseDriverNumber(config?.settings?.leftDriverNumber)
  const rightDriverNumber = parseDriverNumber(config?.settings?.rightDriverNumber)
  const leftStintSelection = normalizeStintSelection(config?.settings?.leftStintSelection)
  const rightStintSelection = normalizeStintSelection(config?.settings?.rightStintSelection)
  const { drivers, getDriver, getTeamColor } = useDriverStore()

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

  const driverOptions = [...drivers].sort((a, b) => a.driver_number - b.driver_number)

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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <DriverSelector
          label="Driver A"
          value={leftDriverNumber}
          options={driverOptions}
          onChange={(nextValue) => updateSetting('leftDriverNumber', nextValue)}
        />
        <DriverSelector
          label="Driver B"
          value={rightDriverNumber}
          options={driverOptions}
          onChange={(nextValue) => updateSetting('rightDriverNumber', nextValue)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <StintSelector
          label="Stint A"
          value={leftStintSelection}
          options={leftStintOptions}
          onChange={(nextValue) => updateSetting('leftStintSelection', nextValue)}
        />
        <StintSelector
          label="Stint B"
          value={rightStintSelection}
          options={rightStintOptions}
          onChange={(nextValue) => updateSetting('rightStintSelection', nextValue)}
        />
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
        >
          vs
        </div>
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
          {ready ? formatDuration(leftAvg!, units) : '—'}
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
          {ready ? formatDuration(rightAvg!, units) : '—'}
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

function DriverSelector({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: number | null
  options: { driver_number: number; name_acronym: string }[]
  onChange: (value: string) => void
}) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 7,
          color: 'var(--muted2)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <select
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: '100%',
          background: 'var(--bg4)',
          color: 'var(--white)',
          border: '0.5px solid var(--border)',
          borderRadius: 3,
          height: 24,
          padding: '0 6px',
          fontFamily: 'var(--mono)',
          fontSize: 10,
        }}
      >
        <option value="">Select driver</option>
        {options.map((driver) => (
          <option key={driver.driver_number} value={driver.driver_number}>
            {driver.name_acronym} #{driver.driver_number}
          </option>
        ))}
      </select>
    </label>
  )
}

function StintSelector({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: StintSelection
  options: number[]
  onChange: (value: string) => void
}) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 7,
          color: 'var(--muted2)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: '100%',
          background: 'var(--bg4)',
          color: 'var(--white)',
          border: '0.5px solid var(--border)',
          borderRadius: 3,
          height: 24,
          padding: '0 6px',
          fontFamily: 'var(--mono)',
          fontSize: 10,
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
    </label>
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
        {formatDuration(value, units)}
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
