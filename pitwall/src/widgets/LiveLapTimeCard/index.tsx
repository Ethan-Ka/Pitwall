import { useEffect, useMemo, useState } from 'react'
import { useLaps } from '../../hooks/useLaps'
import { useRefreshFade } from '../../hooks/useRefreshFade'
import { useWidgetDriver } from '../../hooks/useWidgetDriver'
import { useWidgetConfig } from '../../hooks/useWidgetConfig'
import { useDriverStore } from '../../store/driverStore'
import { useSessionStore } from '../../store/sessionStore'
import { formatLap, EmptyState } from '../widgetUtils'
import type { UnitMode } from '../widgetUtils'

interface LiveLapTimeCardProps {
  widgetId: string
}

type LiveLapStartPayload = {
  driverNumber: number
  lapNumber?: number
  startTimeIso?: string
  startTimeMs?: number
}

export function LiveLapTimeCard({ widgetId }: LiveLapTimeCardProps) {
  const config = useWidgetConfig(widgetId)
  const units: UnitMode = (config?.settings?.units as UnitMode) ?? 's'
  const { driverNumber, badgeLabel } = useWidgetDriver(config?.driverContext ?? 'FOCUS')
  const { getDriver, getTeamColor } = useDriverStore()
  const mode = useSessionStore((s) => s.mode)
  const { data: laps } = useLaps(driverNumber ?? undefined, {
    refetchIntervalMs: mode === 'live' ? 60_000 : 15_000,
  })
  const refreshFade = useRefreshFade([driverNumber, laps])
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [webhookLapStartMs, setWebhookLapStartMs] = useState<number | null>(null)

  const allLaps = useMemo(
    () => [...(laps ?? [])].sort((a, b) => b.lap_number - a.lap_number),
    [laps]
  )
  const activeLap = allLaps[0]

  const activeLapStartedAtMs =
    activeLap?.date_start != null
      ? Date.parse(activeLap.date_start)
      : Number.NaN
  const activeLapStartFromApiMs = Number.isFinite(activeLapStartedAtMs) ? activeLapStartedAtMs : null

  const resolvedLiveLapStartMs =
    webhookLapStartMs != null
      ? webhookLapStartMs
      : activeLapStartFromApiMs

  const isLiveLapRunning =
    mode === 'live'
    && activeLap != null
    && activeLap.lap_duration == null
    && resolvedLiveLapStartMs != null

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

  useEffect(() => {
    if (!isLiveLapRunning) return
    const timer = window.setInterval(() => {
      setNowMs(Date.now())
    }, 200)
    return () => window.clearInterval(timer)
  }, [isLiveLapRunning])

  if (!driverNumber) {
    return <EmptyState message="No driver selected" subMessage="Assign a driver context in widget settings." />
  }

  const driver = getDriver(driverNumber)
  const teamColor = getTeamColor(driverNumber)

  if (!isLiveLapRunning) {
    return <EmptyState message="No lap in progress" subMessage="Waiting for a live lap to start." />
  }

  const liveLapDurationSeconds = Math.max(0, (nowMs - resolvedLiveLapStartMs!) / 1000)

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
              Live lap timer
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 18, flex: 1, justifyContent: 'center' }}>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 7,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--muted2)',
            marginBottom: 2,
          }}
        >
          Live lap time
        </span>
        <span
          style={{
            fontFamily: 'var(--cond)',
            fontSize: 38,
            lineHeight: 1,
            fontWeight: 700,
            color: teamColor,
            textShadow: `0 0 10px ${teamColor}44`,
          }}
        >
          {formatLap(liveLapDurationSeconds, units)}
        </span>
      </div>
    </div>
  )
}
