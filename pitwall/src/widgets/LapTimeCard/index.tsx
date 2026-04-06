import { useEffect, useMemo, useState } from 'react'
import { useLaps } from '../../hooks/useLaps'
import { useRefreshFade } from '../../hooks/useRefreshFade'
import { useWidgetDriver } from '../../hooks/useWidgetDriver'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { useDriverStore } from '../../store/driverStore'
import { useSessionStore } from '../../store/sessionStore'

interface LapTimeCardProps {
  widgetId: string
}

type UnitMode = 's' | 'ms'

type LiveLapStartPayload = {
  driverNumber: number
  lapNumber?: number
  startTimeIso?: string
  startTimeMs?: number
}

function formatLap(seconds: number | null | undefined, units: UnitMode): string {
  if (seconds == null) return '—'
  if (units === 'ms') return `${Math.round(seconds * 1000)} ms`

  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60)
    const remainder = (seconds % 60).toFixed(3).padStart(6, '0')
    return `${minutes}:${remainder}`
  }

  return seconds.toFixed(3)
}

function formatDelta(deltaSeconds: number | null, units: UnitMode): string {
  if (deltaSeconds == null) return '—'
  if (Math.abs(deltaSeconds) < 0.0005) return 'MATCH'

  const sign = deltaSeconds > 0 ? '+' : '-'
  const abs = Math.abs(deltaSeconds)
  if (units === 'ms') return `${sign}${Math.round(abs * 1000)} ms`
  return `${sign}${abs.toFixed(3)}`
}

export function LapTimeCard({ widgetId }: LapTimeCardProps) {
  const tabs = useWorkspaceStore((s) => s.tabs)
  let config = undefined as ReturnType<typeof useWorkspaceStore.getState>['tabs'][0]['widgets'][string] | undefined
  for (const tab of tabs) {
    if (tab.widgets[widgetId]) {
      config = tab.widgets[widgetId]
      break
    }
  }

  const units: UnitMode = (config?.settings?.units as UnitMode) ?? 's'
  const { driverNumber, badgeLabel } = useWidgetDriver(config?.driverContext ?? 'FOCUS')
  const { getDriver, getTeamColor } = useDriverStore()
  const mode = useSessionStore((s) => s.mode)
  const { data: laps } = useLaps(driverNumber ?? undefined, {
    // Webhook-first in live mode; keep API as low-frequency fallback only.
    refetchIntervalMs: mode === 'live' ? 60_000 : 15_000,
  })
  const refreshFade = useRefreshFade([driverNumber, laps])
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [webhookLapStartMs, setWebhookLapStartMs] = useState<number | null>(null)

  if (!driverNumber) {
    return <EmptyState message="No driver selected" subMessage="Assign a driver context in widget settings." />
  }

  const driver = getDriver(driverNumber)
  const teamColor = getTeamColor(driverNumber)
  const allLaps = useMemo(
    () => [...(laps ?? [])].sort((a, b) => b.lap_number - a.lap_number),
    [laps]
  )
  const timedLaps = allLaps.filter((lap) => lap.lap_duration != null)

  if (timedLaps.length === 0) {
    return <EmptyState message="No lap timings yet" subMessage="Waiting for a completed lap." />
  }

  const latestLap = timedLaps[0]
  const activeLap = allLaps[0]

  const activeLapStartedAtMs =
    activeLap?.date_start != null
      ? Date.parse(activeLap.date_start)
      : Number.NaN
  const activeLapStartFromApiMs = Number.isFinite(activeLapStartedAtMs) ? activeLapStartedAtMs : null

  useEffect(() => {
    setWebhookLapStartMs(null)
  }, [driverNumber])

  useEffect(() => {
    function onWebhookLapStart(event: Event) {
      const customEvent = event as CustomEvent<LiveLapStartPayload>
      const payload = customEvent.detail
      if (!payload || payload.driverNumber !== driverNumber) return

      const startFromMs =
        typeof payload.startTimeMs === 'number' && Number.isFinite(payload.startTimeMs)
          ? payload.startTimeMs
          : payload.startTimeIso
            ? Date.parse(payload.startTimeIso)
            : Number.NaN

      if (!Number.isFinite(startFromMs)) return
      setWebhookLapStartMs(startFromMs)
    }

    window.addEventListener('pitwall-live-lap-start', onWebhookLapStart as EventListener)
    return () => {
      window.removeEventListener('pitwall-live-lap-start', onWebhookLapStart as EventListener)
    }
  }, [driverNumber])

  const resolvedLiveLapStartMs =
    webhookLapStartMs != null
      ? webhookLapStartMs
      : activeLapStartFromApiMs

  const isLiveLapRunning =
    mode === 'live'
    && activeLap != null
    && activeLap.lap_duration == null
    && resolvedLiveLapStartMs != null
  const liveLapDurationSeconds = isLiveLapRunning
    ? Math.max(0, (nowMs - resolvedLiveLapStartMs) / 1000)
    : null

  useEffect(() => {
    if (!isLiveLapRunning) return
    const timer = window.setInterval(() => {
      setNowMs(Date.now())
    }, 200)
    return () => window.clearInterval(timer)
  }, [isLiveLapRunning])
  const bestLap = timedLaps.reduce((best, lap) => {
    if (lap.lap_duration == null) return best
    if (!best || (best.lap_duration != null && lap.lap_duration < best.lap_duration)) return lap
    return best
  }, timedLaps[0])

  const bestS1 = Math.min(...timedLaps.map((lap) => lap.duration_sector_1 ?? Number.POSITIVE_INFINITY))
  const bestS2 = Math.min(...timedLaps.map((lap) => lap.duration_sector_2 ?? Number.POSITIVE_INFINITY))
  const bestS3 = Math.min(...timedLaps.map((lap) => lap.duration_sector_3 ?? Number.POSITIVE_INFINITY))

  const lastLap = latestLap.lap_duration
  const pbLap = bestLap.lap_duration
  const deltaToPb = lastLap != null && pbLap != null ? lastLap - pbLap : null
  const isLapPb = lastLap != null && pbLap != null && Math.abs(lastLap - pbLap) < 0.0005
  const headerLabel = isLiveLapRunning
    ? `Live lap (L${activeLap.lap_number})`
    : `Last lap (L${latestLap.lap_number})`
  const heroLapValue = isLiveLapRunning ? liveLapDurationSeconds : lastLap

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
              Lap time card
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, position: 'relative' }}>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 7,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--muted2)',
            }}
          >
            {headerLabel}
          </span>
          {isLiveLapRunning && (
            <span
              style={{
                position: 'absolute',
                left: 0,
                top: 16,
                fontFamily: 'var(--cond)',
                fontSize: 23,
                lineHeight: 1,
                fontWeight: 700,
                color: 'var(--muted2)',
                opacity: 0.32,
                pointerEvents: 'none',
              }}
            >
              {formatLap(lastLap, units)}
            </span>
          )}
          {isLiveLapRunning && (
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 7,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--muted2)',
              }}
            >
              Last lap (L{latestLap.lap_number})
            </span>
          )}
          <span
            style={{
              fontFamily: 'var(--cond)',
              fontSize: 30,
              lineHeight: 0.95,
              fontWeight: 700,
              color: isLiveLapRunning ? teamColor : isLapPb ? 'var(--green)' : 'var(--white)',
              textShadow: isLiveLapRunning ? `0 0 10px ${teamColor}44` : undefined,
            }}
          >
            {formatLap(heroLapValue, units)}
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

function EmptyState({ message, subMessage }: { message: string; subMessage: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--mono)',
      }}
    >
      <span style={{ fontSize: 9, color: 'var(--muted)' }}>{message}</span>
      <span style={{ fontSize: 8, color: 'var(--muted2)' }}>{subMessage}</span>
    </div>
  )
}
