import { useMemo, useRef } from 'react'
import { useCarData } from '../../hooks/useCarData'
import { useFastF1Telemetry, useFastF1Laps } from '../../hooks/useFastF1'
import { useWidgetDriver } from '../../hooks/useWidgetDriver'
import { useWidgetConfig } from '../../hooks/useWidgetConfig'
import { useDriverStore } from '../../store/driverStore'
import { useSessionStore } from '../../store/sessionStore'
import { useRefreshFade } from '../../hooks/useRefreshFade'
import { EmptyState } from '../widgetUtils'

const DRS_OPEN_THRESHOLD = 10
const MAX_RPM = 15_000
const SIDE_PROFILE_BASE = '/seasons/2026/cars/sideProfile/'

// Keyed by team shortName from teams.json → asset filename
const TEAM_CAR_ASSETS: Record<string, string> = {
  Alpine: '2026alpinecarright.avif',
  'Aston Martin': '2026astonmartincarright.avif',
  Audi: '2026audicarright.avif',
  Cadillac: '2026cadillaccarright.avif',
  Haas: '2026haascarright.avif',
  McLaren: '2026mclarencarright.avif',
  Mercedes: '2026mercedescarright.avif',
  'Racing Bulls': '2026racingbullscarright.avif',
  'Red Bull': '2026redbullracingcarright.avif',
  Williams: '2026williamscarright.avif',
  // Ferrari has no 2026 side profile — falls through to masked fallback
}

const FALLBACK_CAR_URL = `${SIDE_PROFILE_BASE}2026mercedescarright.avif`

interface NormalizedSample {
  speed: number
  gear: number
  rpm: number
  throttle: number // 0–100
  brake: number    // 0–100
  drsOpen: boolean
}

function resolveCarAsset(teamName: string | null | undefined): { url: string; hasLivery: boolean } {
  if (!teamName) return { url: FALLBACK_CAR_URL, hasLivery: false }
  const file = TEAM_CAR_ASSETS[teamName]
  if (file) return { url: `${SIDE_PROFILE_BASE}${file}`, hasLivery: true }
  return { url: FALLBACK_CAR_URL, hasLivery: false }
}

function TelemetryBar({
  label, value, pct, color,
}: { label: string; value: string; pct: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--muted2)',
        letterSpacing: '0.1em', width: 24, flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{
        flex: 1, height: 3, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{
          width: `${Math.min(Math.max(pct * 100, 0), 100)}%`,
          height: '100%', background: color, borderRadius: 2,
          transition: 'width 0.3s ease',
        }} />
      </div>
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--white)',
        textAlign: 'right', minWidth: 38, flexShrink: 0,
      }}>
        {value}
      </span>
    </div>
  )
}

export function CarVisualization({ widgetId }: { widgetId: string }) {
  const config = useWidgetConfig(widgetId)
  const { driverNumber, badgeLabel } = useWidgetDriver(config?.driverContext ?? 'FOCUS')
  const getDriver = useDriverStore((s) => s.getDriver)
  const getTeamColor = useDriverStore((s) => s.getTeamColor)
  const mode = useSessionStore((s) => s.mode)
  const activeFastF1Session = useSessionStore((s) => s.activeFastF1Session)
  const fastf1Available = useSessionStore((s) => s.fastf1ServerAvailable)

  const driver = driverNumber != null ? getDriver(driverNumber) : null
  const driverAcronym = driver?.name_acronym
  const teamColor = driverNumber != null ? getTeamColor(driverNumber) : 'var(--purple)'
  const teamName = driver?.team_name ?? null

  const { url: carUrl, hasLivery } = useMemo(() => resolveCarAsset(teamName), [teamName])

  // Live path: OpenF1 car_data with incremental date_gt polling
  const { data: liveData } = useCarData(mode === 'live' ? driverNumber : null)

  // Historical path: FastF1 telemetry for peak-speed sample of the last completed lap
  const histEnabled = mode === 'historical' && fastf1Available && !!activeFastF1Session && !!driverAcronym
  const { data: laps } = useFastF1Laps(histEnabled ? activeFastF1Session : null, driverAcronym)

  const lastLapNumber = useMemo(() => {
    if (!laps?.length) return undefined
    const completed = laps.filter((l) => l.LapTime != null)
    return completed.length > 0 ? Math.max(...completed.map((l) => l.LapNumber)) : undefined
  }, [laps])

  const { data: telemetry } = useFastF1Telemetry(
    histEnabled && lastLapNumber != null ? activeFastF1Session : null,
    driverAcronym,
    lastLapNumber,
  )

  const peakSample = useMemo((): NormalizedSample | null => {
    if (!telemetry?.length) return null
    const peak = telemetry.reduce((a, b) => (b.Speed > a.Speed ? b : a), telemetry[0])
    return {
      speed: peak.Speed,
      gear: peak.nGear,
      rpm: peak.RPM,
      throttle: peak.Throttle,
      brake: peak.Brake ? 100 : 0,
      drsOpen: peak.DRS >= DRS_OPEN_THRESHOLD,
    }
  }, [telemetry])

  const liveSample = useMemo((): NormalizedSample | null => {
    if (!liveData) return null
    return {
      speed: liveData.speed,
      gear: liveData.n_gear,
      rpm: liveData.rpm,
      throttle: liveData.throttle,
      brake: liveData.brake,
      drsOpen: liveData.drs >= DRS_OPEN_THRESHOLD,
    }
  }, [liveData])

  const currentSample = mode === 'live' ? liveSample : peakSample
  const isHistorical = mode === 'historical'
  const refreshFade = useRefreshFade([liveData])

  // Persist the last known good sample so the car stays visible when
  // switching to historical mode before FastF1 data loads.
  const lastSampleRef = useRef<NormalizedSample | null>(null)
  if (currentSample != null) lastSampleRef.current = currentSample
  const sample = currentSample ?? lastSampleRef.current

  if (!driverNumber) return <EmptyState message="No driver selected" />

  if (!sample) {
    return (
      <EmptyState
        message="Waiting for telemetry…"
      />
    )
  }

  const rpmPct = sample.rpm / MAX_RPM

  return (
    <div
      className={refreshFade ? 'data-refresh-fade' : undefined}
      style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        padding: '8px 10px', gap: 6, overflow: 'hidden', boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 3, height: 12, borderRadius: 1, flexShrink: 0,
            background: teamColor, display: 'inline-block',
          }} />
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em',
            color: 'var(--white)', fontWeight: 600,
          }}>
            {driverAcronym ?? '—'}
          </span>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--muted2)',
            letterSpacing: '0.08em',
          }}>
            {teamName ?? '—'}
          </span>
          {isHistorical && (
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 6, letterSpacing: '0.12em',
              color: 'var(--amber)', background: 'rgba(224,144,0,0.12)',
              border: '0.5px solid rgba(224,144,0,0.3)', borderRadius: 2, padding: '1px 4px',
            }}>
              PEAK
            </span>
          )}
          {!hasLivery && (
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 6, letterSpacing: '0.1em',
              color: 'var(--muted2)', background: 'var(--bg3)',
              border: '0.5px solid var(--border)', borderRadius: 2, padding: '1px 4px',
            }}>
              2026 LIVERY N/A
            </span>
          )}
        </div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--muted2)', letterSpacing: '0.1em' }}>
          {badgeLabel}
        </span>
      </div>

      {/* Main row: speed + gear / car image / DRS */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 10, alignItems: 'stretch' }}>

        {/* Left column: Speed + Gear */}
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          gap: 6, flexShrink: 0, width: 68,
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--cond)', fontSize: 46, fontWeight: 800,
              lineHeight: 0.88, color: 'var(--white)', letterSpacing: '-0.02em',
            }}>
              {Math.round(sample.speed)}
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--muted2)',
              letterSpacing: '0.14em', marginTop: 3,
            }}>
              KM/H
            </div>
          </div>

          <div style={{ width: '80%', height: 0.5, background: 'var(--border)' }} />

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{
              fontFamily: 'var(--cond)', fontSize: 34, fontWeight: 800,
              lineHeight: 1, color: teamColor,
            }}>
              {sample.gear > 0 ? sample.gear : 'N'}
            </span>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--muted2)',
              letterSpacing: '0.14em',
            }}>
              GEAR
            </span>
          </div>
        </div>

        {/* Center: Car image */}
        <div style={{
          flex: 1, minWidth: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', position: 'relative',
        }}>
          <img
            src={carUrl}
            alt={teamName ?? 'F1 Car'}
            draggable={false}
            style={{
              maxHeight: '100%',
              maxWidth: '100%',
              objectFit: 'contain',
              display: 'block',
              userSelect: 'none',
              pointerEvents: 'none',
              filter: hasLivery ? undefined : 'grayscale(1) brightness(1.35)',
              transition: 'filter 0.3s ease',
            }}
          />
          {/* White overlay to wash out livery when no team asset */}
          {!hasLivery && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(255,255,255,0.28)',
              pointerEvents: 'none',
            }} />
          )}
        </div>

        {/* Right column: DRS indicator */}
        <div style={{
          flexShrink: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 4, width: 34,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: sample.drsOpen ? 'rgba(74,222,128,0.15)' : 'transparent',
            border: `1.5px solid ${sample.drsOpen ? 'var(--green)' : 'var(--border2)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.25s ease',
          }}>
            <span style={{
              fontSize: 7, lineHeight: 1,
              color: sample.drsOpen ? 'var(--green)' : 'var(--muted2)',
            }}>
              ●
            </span>
          </div>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 6, letterSpacing: '0.1em',
            color: sample.drsOpen ? 'var(--green)' : 'var(--muted2)',
            textAlign: 'center', transition: 'color 0.25s ease',
          }}>
            DRS
          </span>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 6, letterSpacing: '0.08em',
            color: sample.drsOpen ? 'var(--green)' : 'var(--muted2)',
            textAlign: 'center', transition: 'color 0.25s ease',
          }}>
            {sample.drsOpen ? 'OPEN' : 'CLSD'}
          </span>
        </div>
      </div>

      {/* Bottom: Telemetry bars */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ height: 0.5, background: 'var(--border)', marginBottom: 1 }} />
        <TelemetryBar
          label="THR"
          value={`${Math.round(sample.throttle)}%`}
          pct={sample.throttle / 100}
          color="var(--green)"
        />
        <TelemetryBar
          label="BRK"
          value={`${Math.round(sample.brake)}%`}
          pct={sample.brake / 100}
          color="var(--red)"
        />
        <TelemetryBar
          label="RPM"
          value={sample.rpm.toLocaleString()}
          pct={rpmPct}
          color={teamColor}
        />
      </div>
    </div>
  )
}
