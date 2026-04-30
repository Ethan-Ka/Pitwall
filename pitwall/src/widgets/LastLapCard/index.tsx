export const HELP = `# Last Lap Card

Shows the most recently completed lap time for the selected driver, with personal best comparison.

- **Lap time**: Last completed lap duration.
- **PB**: Personal best lap time for this session.
- **Delta to PB**: Difference between last lap and personal best (green = matched PB, red = slower).
- **S1 / S2 / S3**: Per-sector times with personal best sector highlights.

Unfamiliar terms:

- *PB*: Personal Best — the fastest lap a driver has set in the current session.
- *Delta*: Difference in seconds between two times (positive = slower, negative = faster).

Notes: only completed laps with a recorded duration are shown. The timer does not count up during the active lap — use the Lap Time Card widget for a live running timer.
`
import { useMemo } from 'react'
import { useLaps } from '../../hooks/useLaps'
import { useRefreshFade } from '../../hooks/useRefreshFade'
import { useWidgetDriver } from '../../hooks/useWidgetDriver'
import { useWidgetConfig } from '../../hooks/useWidgetConfig'
import { useDriverStore } from '../../store/driverStore'
import { useSessionStore } from '../../store/sessionStore'
import { formatLap, formatDelta, EmptyState } from '../widgetUtils'
import type { UnitMode } from '../widgetUtils'

interface LastLapCardProps {
  widgetId: string
}

export function LastLapCard({ widgetId }: LastLapCardProps) {
  const config = useWidgetConfig(widgetId)
  const units: UnitMode = (config?.settings?.units as UnitMode) ?? 's'
  const { driverNumber, badgeLabel } = useWidgetDriver(config?.driverContext ?? 'FOCUS')
  const getDriver = useDriverStore((s) => s.getDriver)
  const getTeamColor = useDriverStore((s) => s.getTeamColor)
  const mode = useSessionStore((s) => s.mode)
  const { data: laps } = useLaps(driverNumber ?? undefined, {
    refetchIntervalMs: mode === 'live' ? 60_000 : 15_000,
  })
  const refreshFade = useRefreshFade([driverNumber, laps])

  const timedLaps = useMemo(
    () =>
      [...(laps ?? [])]
        .sort((a, b) => b.lap_number - a.lap_number)
        .filter((lap) => lap.lap_duration != null),
    [laps]
  )

  if (!driverNumber) {
    return <EmptyState message="No driver selected" subMessage="Assign a driver context in widget settings." />
  }

  const driver = getDriver(driverNumber)
  const teamColor = getTeamColor(driverNumber)

  if (timedLaps.length === 0) {
    return <EmptyState message="No lap timings yet" subMessage="Waiting for a completed lap." />
  }

  const latestLap = timedLaps[0]
  const bestLap = timedLaps.reduce((best, lap) => {
    if (!best || (best.lap_duration != null && lap.lap_duration! < best.lap_duration!)) return lap
    return best
  }, timedLaps[0])

  const bestS1 = Math.min(...timedLaps.map((lap) => lap.duration_sector_1 ?? Number.POSITIVE_INFINITY))
  const bestS2 = Math.min(...timedLaps.map((lap) => lap.duration_sector_2 ?? Number.POSITIVE_INFINITY))
  const bestS3 = Math.min(...timedLaps.map((lap) => lap.duration_sector_3 ?? Number.POSITIVE_INFINITY))

  const lastLap = latestLap.lap_duration
  const pbLap = bestLap.lap_duration
  const deltaToPb = lastLap != null && pbLap != null ? lastLap - pbLap : null
  const isLapPb = lastLap != null && pbLap != null && Math.abs(lastLap - pbLap) < 0.0005

  return (
    <div
      className={refreshFade ? 'data-refresh-fade' : undefined}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 10,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 3,
              height: 22,
              borderRadius: 2,
              background: teamColor,
              boxShadow: `0 0 8px ${teamColor}66`,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 7,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--muted2)',
              }}
            >
              Last lap
            </span>
            <span
              style={{
                fontFamily: 'var(--cond)',
                fontSize: 16,
                lineHeight: 1,
                fontWeight: 700,
                color: 'var(--white)',
              }}
            >
              {driver?.name_acronym ?? `#${driverNumber}`}
            </span>
          </div>
        </div>

        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 7,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          {badgeLabel}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 2 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 7,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--muted2)',
            }}
          >
            Last lap (L{latestLap.lap_number})
          </span>
          <span
            style={{
              fontFamily: 'var(--cond)',
              fontSize: 30,
              lineHeight: 0.95,
              fontWeight: 700,
              color: isLapPb ? 'var(--green)' : 'var(--white)',
            }}
          >
            {formatLap(lastLap, units)}
          </span>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 7,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--muted2)',
              marginBottom: 2,
            }}
          >
            Delta to PB
          </div>
          <div
            style={{
              fontFamily: 'var(--cond)',
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1,
              color: isLapPb ? 'var(--green)' : deltaToPb != null && deltaToPb > 0 ? 'var(--amber)' : 'var(--white)',
            }}
          >
            {isLapPb ? 'PB' : formatDelta(deltaToPb, units)}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 6,
        }}
      >
        <SectorTile
          label="S1"
          value={latestLap.duration_sector_1}
          isBest={latestLap.duration_sector_1 != null && latestLap.duration_sector_1 <= bestS1 + 0.0005}
          units={units}
        />
        <SectorTile
          label="S2"
          value={latestLap.duration_sector_2}
          isBest={latestLap.duration_sector_2 != null && latestLap.duration_sector_2 <= bestS2 + 0.0005}
          units={units}
        />
        <SectorTile
          label="S3"
          value={latestLap.duration_sector_3}
          isBest={latestLap.duration_sector_3 != null && latestLap.duration_sector_3 <= bestS3 + 0.0005}
          units={units}
        />
      </div>
    </div>
  )
}

function SectorTile({
  label,
  value,
  isBest,
  units,
}: {
  label: string
  value: number | null
  isBest: boolean
  units: UnitMode
}) {
  return (
    <div
      style={{
        border: `0.5px solid ${isBest ? 'rgba(29,184,106,0.45)' : 'var(--border)'}`,
        background: 'linear-gradient(180deg, var(--bg4) 0%, var(--bg3) 100%)',
        borderRadius: 3,
        padding: '6px 7px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 7,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--muted2)',
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: isBest ? 'var(--green)' : 'var(--white)',
          fontWeight: 600,
        }}
      >
        {formatLap(value, units)}
      </div>
    </div>
  )
}
