import { useLaps } from '../../hooks/useLaps'
import { useWidgetDriver } from '../../hooks/useWidgetDriver'
import { useWidgetConfig } from '../../hooks/useWidgetConfig'
import { useRefreshFade } from '../../hooks/useRefreshFade'
import { formatTime, formatDelta, EmptyState } from '../widgetUtils'
import type { UnitMode } from '../widgetUtils'

interface SectorMiniCardsProps {
  widgetId: string
}

export function SectorMiniCards({ widgetId }: SectorMiniCardsProps) {
  const config = useWidgetConfig(widgetId)
  const units: UnitMode = (config?.settings?.units as UnitMode) ?? 's'
  const { driverNumber } = useWidgetDriver(config?.driverContext ?? 'FOCUS')
  const { data: laps } = useLaps(driverNumber ?? undefined)
  const refreshFade = useRefreshFade([driverNumber, laps])

  if (!driverNumber) {
    return <EmptyState message="No driver selected" subMessage="Assign a driver context in widget settings." />
  }

  const timedLaps = (laps ?? []).filter(
    (l) => l.duration_sector_1 != null && l.duration_sector_2 != null && l.duration_sector_3 != null
  )

  if (timedLaps.length === 0) {
    return <EmptyState message="No sector data" subMessage="Waiting for a completed lap." />
  }

  const latest = [...timedLaps].sort((a, b) => b.lap_number - a.lap_number)[0]

  const bestS1 = Math.min(...timedLaps.map((l) => l.duration_sector_1 ?? Infinity))
  const bestS2 = Math.min(...timedLaps.map((l) => l.duration_sector_2 ?? Infinity))
  const bestS3 = Math.min(...timedLaps.map((l) => l.duration_sector_3 ?? Infinity))

  const sectors = [
    { label: 'S1', value: latest.duration_sector_1, best: bestS1 },
    { label: 'S2', value: latest.duration_sector_2, best: bestS2 },
    { label: 'S3', value: latest.duration_sector_3, best: bestS3 },
  ]

  return (
    <div
      className={refreshFade ? 'data-refresh-fade' : undefined}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 8,
        boxSizing: 'border-box',
      }}
    >
      <div style={{
        fontFamily: 'var(--mono)',
        fontSize: 7,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--muted2)',
        marginBottom: 2,
      }}>
        Lap {latest.lap_number} · Sector times
      </div>

      {sectors.map(({ label, value, best }) => {
        const isPb = value != null && Math.abs(value - best) < 0.0005
        const delta = value != null && Number.isFinite(best) ? value - best : null
        return (
          <SectorCard
            key={label}
            label={label}
            value={value ?? null}
            delta={delta}
            isPb={isPb}
            units={units}
          />
        )
      })}
    </div>
  )
}

function SectorCard({
  label,
  value,
  delta,
  isPb,
  units,
}: {
  label: string
  value: number | null
  delta: number | null
  isPb: boolean
  units: UnitMode
}) {
  const accentColor = isPb ? 'var(--green)' : delta != null && delta > 0 ? 'var(--amber)' : 'var(--muted)'

  return (
    <div style={{
      flex: 1,
      background: 'linear-gradient(180deg, var(--bg4) 0%, var(--bg3) 100%)',
      border: `0.5px solid ${isPb ? 'rgba(29,184,106,0.45)' : 'var(--border)'}`,
      borderRadius: 3,
      padding: '5px 8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: 7,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--muted2)',
        }}>
          {label}
        </span>
        <span style={{
          fontFamily: 'var(--cond)',
          fontSize: 20,
          fontWeight: 700,
          lineHeight: 1,
          color: isPb ? 'var(--green)' : 'var(--white)',
        }}>
          {formatTime(value)}
        </span>
      </div>

      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: 7,
          color: 'var(--muted2)',
          letterSpacing: '0.08em',
          marginBottom: 2,
        }}>
          {isPb ? 'PB' : 'vs PB'}
        </div>
        <div style={{
          fontFamily: 'var(--cond)',
          fontSize: 16,
          fontWeight: 700,
          color: accentColor,
          lineHeight: 1,
        }}>
          {isPb ? '◆' : formatDelta(delta, units)}
        </div>
      </div>
    </div>
  )
}
