export const HELP = `# Head-to-Head Delta

Compares two drivers' time gaps and lap performance in real time.

- **Driver selection**: Pick two drivers to compare (A vs. B).
- **Gap**: Shows the time difference between the two drivers on track.
- **Last lap**: Displays the most recent completed lap time for each driver.
- **Delta**: Shows the change in gap since the previous lap.

**Tips:**
- Use for live battles, undercut/overcut strategy, or tracking a chase.
- Works best when both drivers are on the lead lap.

**Notes:**
- If a driver is lapped or has a non-numeric gap (e.g., "+1 LAP"), delta may be unavailable.
- Data updates as new lap/interval data arrives.

**Unfamiliar terms:**
- *Gap*: Time difference to the car ahead or between two cars.
- *Delta*: Change in gap or lap time between updates.
`
import { useIntervals } from '../../hooks/useIntervals'
import { useLaps } from '../../hooks/useLaps'
import { usePositions } from '../../hooks/usePositions'
import { useDriverStore } from '../../store/driverStore'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { useWidgetConfig } from '../../hooks/useWidgetConfig'
import { useRefreshFade } from '../../hooks/useRefreshFade'
import { DriverChipPicker } from '../../components/DriverChipPicker'
import { formatTime, formatGap } from '../widgetUtils'
import type { OpenF1Interval } from '../../api/openf1'
import type { OpenF1Lap } from '../../api/openf1'

interface HeadToHeadDeltaProps {
  widgetId: string
}

function parseDriverNumber(value: unknown): number | null {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

/** Returns the most recent completed non-pit-out lap duration for a driver. */
function getLastLapDuration(laps: OpenF1Lap[] | undefined): number | null {
  if (!laps || laps.length === 0) return null
  const valid = laps.filter((l) => l.lap_duration != null && !l.is_pit_out_lap)
  if (valid.length === 0) return null
  const latest = valid.reduce((best, l) => (l.lap_number > best.lap_number ? l : best))
  return latest.lap_duration ?? null
}

/** Returns the latest interval record for a specific driver from the intervals array. */
function getDriverInterval(intervals: OpenF1Interval[] | undefined, driverNumber: number | null): OpenF1Interval | null {
  if (!intervals || driverNumber == null) return null
  return intervals.find((i) => i.driver_number === driverNumber) ?? null
}

/**
 * Compute the numeric gap delta between two drivers.
 * Returns null when either gap_to_leader is non-numeric (e.g. "+1 LAP"),
 * which prevents NaN from propagating into color logic.
 */
function computeVsDelta(leftGap: number | string | null | undefined, rightGap: number | string | null | undefined): number | null {
  if (typeof leftGap !== 'number' || typeof rightGap !== 'number') return null
  // positive = right is further behind, negative = left is further behind
  return rightGap - leftGap
}

export function HeadToHeadDelta({ widgetId }: HeadToHeadDeltaProps) {
  // Resolve tab ID for config updates
  const tabId = useWorkspaceStore((s) => {
    for (const tab of s.tabs) {
      if (tab.widgets[widgetId]) return tab.id
    }
    return null
  })
  const updateWidgetConfig = useWorkspaceStore((s) => s.updateWidgetConfig)
  const config = useWidgetConfig(widgetId)

  const leftDriverNumber = parseDriverNumber(config?.settings?.leftDriverNumber)
  const rightDriverNumber = parseDriverNumber(config?.settings?.rightDriverNumber)

  const drivers = useDriverStore((s) => s.drivers)
  const getDriver = useDriverStore((s) => s.getDriver)
  const getTeamColor = useDriverStore((s) => s.getTeamColor)

  function updateSetting(key: 'leftDriverNumber' | 'rightDriverNumber', value: string) {
    if (!tabId || !config) return
    const nextValue = value === '' ? null : Number(value)
    updateWidgetConfig(tabId, widgetId, {
      settings: {
        ...config.settings,
        [key]: nextValue,
      },
    })
  }

  const driverOptions = [...drivers]
    .sort((a, b) => a.driver_number - b.driver_number)
    .map((d) => ({
      driver_number: d.driver_number,
      name_acronym: d.name_acronym,
      teamColor: getTeamColor(d.driver_number),
    }))

  // Data hooks — all unconditional at top level
  const { data: intervals } = useIntervals()
  const { data: positions } = usePositions()
  const { data: leftLaps } = useLaps(leftDriverNumber ?? undefined)
  const { data: rightLaps } = useLaps(rightDriverNumber ?? undefined)

  const refreshFade = useRefreshFade([intervals, leftLaps, rightLaps])

  // --- Derive per-driver data ---

  const leftDriverInfo = leftDriverNumber != null ? getDriver(leftDriverNumber) : undefined
  const rightDriverInfo = rightDriverNumber != null ? getDriver(rightDriverNumber) : undefined

  const leftAcronym = leftDriverInfo?.name_acronym ?? (leftDriverNumber != null ? `#${leftDriverNumber}` : null)
  const rightAcronym = rightDriverInfo?.name_acronym ?? (rightDriverNumber != null ? `#${rightDriverNumber}` : null)

  const leftColor = leftDriverNumber != null ? getTeamColor(leftDriverNumber) : 'var(--muted2)'
  const rightColor = rightDriverNumber != null ? getTeamColor(rightDriverNumber) : 'var(--muted2)'

  const leftPosition = leftDriverNumber != null
    ? (positions?.find((p) => p.driver_number === leftDriverNumber)?.position ?? null)
    : null
  const rightPosition = rightDriverNumber != null
    ? (positions?.find((p) => p.driver_number === rightDriverNumber)?.position ?? null)
    : null

  const leftInterval = getDriverInterval(intervals, leftDriverNumber)
  const rightInterval = getDriverInterval(intervals, rightDriverNumber)

  const leftGapToLeader = leftInterval?.gap_to_leader ?? null
  const rightGapToLeader = rightInterval?.gap_to_leader ?? null

  const leftLastLap = getLastLapDuration(leftLaps)
  const rightLastLap = getLastLapDuration(rightLaps)

  // vs delta: rightGap - leftGap; positive means right is further behind leader => left is ahead
  const vsDelta = computeVsDelta(leftGapToLeader, rightGapToLeader)

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
      {/* Driver pickers row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 6 }}>
        <DriverChipPicker
          value={leftDriverNumber}
          options={driverOptions}
          onChange={(n) => updateSetting('leftDriverNumber', n == null ? '' : String(n))}
          align="left"
          placeholder="Driver A"
        />
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 7,
            color: 'var(--muted2)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            textAlign: 'center',
            paddingInline: 4,
          }}
        >
          vs
        </span>
        <DriverChipPicker
          value={rightDriverNumber}
          options={driverOptions}
          onChange={(n) => updateSetting('rightDriverNumber', n == null ? '' : String(n))}
          align="right"
          placeholder="Driver B"
        />
      </div>

      {/* Main comparison card */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'stretch',
          gap: 6,
          minHeight: 0,
        }}
      >
        {/* Left driver column */}
        <DriverColumn
          acronym={leftAcronym}
          teamColor={leftColor}
          position={leftPosition}
          gapToLeader={leftGapToLeader}
          lastLap={leftLastLap}
          align="left"
          // Ahead = green: left gap is numerically smaller than right gap
          gapColor={
            vsDelta == null
              ? 'var(--muted)'
              : vsDelta > 0
                ? 'var(--green)'
                : vsDelta < 0
                  ? 'var(--red)'
                  : 'var(--muted)'
          }
        />

        {/* Center column */}
        <CenterColumn vsDelta={vsDelta} />

        {/* Right driver column */}
        <DriverColumn
          acronym={rightAcronym}
          teamColor={rightColor}
          position={rightPosition}
          gapToLeader={rightGapToLeader}
          lastLap={rightLastLap}
          align="right"
          // Right is ahead = green: right gap is numerically smaller than left gap
          gapColor={
            vsDelta == null
              ? 'var(--muted)'
              : vsDelta < 0
                ? 'var(--green)'
                : vsDelta > 0
                  ? 'var(--red)'
                  : 'var(--muted)'
          }
        />
      </div>
    </div>
  )
}

interface DriverColumnProps {
  acronym: string | null
  teamColor: string
  position: number | null
  gapToLeader: number | string | null | undefined
  lastLap: number | null
  align: 'left' | 'right'
  gapColor: string
}

function DriverColumn({ acronym, teamColor, position, gapToLeader, lastLap, align, gapColor }: DriverColumnProps) {
  const isRight = align === 'right'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isRight ? 'flex-end' : 'flex-start',
        gap: 6,
        padding: '8px 10px',
        borderRadius: 4,
        border: '0.5px solid var(--border)',
        background: 'linear-gradient(180deg, var(--bg4) 0%, var(--bg3) 100%)',
        // Team color left/right border accent
        borderLeft: isRight ? '0.5px solid var(--border)' : `2px solid ${teamColor}`,
        borderRight: isRight ? `2px solid ${teamColor}` : '0.5px solid var(--border)',
        minWidth: 0,
      }}
    >
      {/* Driver acronym */}
      <span
        style={{
          fontFamily: 'var(--cond)',
          fontSize: 28,
          fontWeight: 700,
          color: acronym != null ? 'var(--white)' : 'var(--muted2)',
          lineHeight: 1,
          letterSpacing: '0.02em',
        }}
      >
        {acronym ?? '—'}
      </span>

      {/* Position */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isRight ? 'flex-end' : 'flex-start', gap: 1 }}>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 7,
            color: 'var(--muted2)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Position
        </span>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 16,
            fontWeight: 700,
            color: position != null && position <= 3 ? 'var(--gold)' : 'var(--muted)',
            lineHeight: 1,
          }}
        >
          {position != null ? `P${position}` : '—'}
        </span>
      </div>

      {/* Gap to leader */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isRight ? 'flex-end' : 'flex-start', gap: 1 }}>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 7,
            color: 'var(--muted2)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Gap Leader
        </span>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 12,
            color: gapToLeader === 0 || gapToLeader === null ? 'var(--muted)' : gapColor,
            lineHeight: 1,
          }}
        >
          {formatGap(gapToLeader)}
        </span>
      </div>

      {/* Last lap */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isRight ? 'flex-end' : 'flex-start', gap: 1 }}>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 7,
            color: 'var(--muted2)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Last Lap
        </span>
        <span
          style={{
            fontFamily: 'var(--cond)',
            fontSize: 14,
            color: lastLap != null ? 'var(--white)' : 'var(--muted2)',
            lineHeight: 1,
          }}
        >
          {formatTime(lastLap)}
        </span>
      </div>
    </div>
  )
}

function CenterColumn({ vsDelta }: { vsDelta: number | null }) {
  // Format delta as a signed gap string, e.g. "+4.321" or "-2.100"
  let deltaLabel = '—'
  let deltaColor = 'var(--muted2)'

  if (vsDelta != null) {
    if (Math.abs(vsDelta) < 0.0005) {
      deltaLabel = 'EVEN'
      deltaColor = 'var(--muted2)'
    } else {
      const sign = vsDelta > 0 ? '+' : '-'
      deltaLabel = `${sign}${Math.abs(vsDelta).toFixed(3)}`
      // Positive delta = right is further behind = left is ahead; center shows neutral gap
      deltaColor = 'var(--muted)'
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingInline: 4,
        minWidth: 52,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 7,
          color: 'var(--muted2)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        vs
      </span>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          padding: '6px 8px',
          borderRadius: 4,
          border: '0.5px solid var(--border)',
          background: 'var(--bg4)',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 7,
            color: 'var(--muted2)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          Gap
        </span>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: deltaColor,
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {deltaLabel}
        </span>
      </div>
    </div>
  )
}
