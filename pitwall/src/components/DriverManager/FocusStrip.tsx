import { useState } from 'react'
import { useDriverStore } from '../../store/driverStore'
import { usePositions } from '../../hooks/usePositions'
import { DriverManagerPanel } from './DriverManagerPanel'

function Chip({
  label,
  color,
  active,
  onClick,
}: {
  label: string
  color: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '2px 8px',
        borderRadius: 3,
        border: `0.5px solid ${active ? color : `${color}55`}`,
        background: active ? `${color}22` : 'transparent',
        fontFamily: 'var(--mono)',
        fontSize: 9,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: active ? color : `${color}99`,
        cursor: 'pointer',
        transition: 'all 0.12s',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  )
}

function Divider() {
  return (
    <div style={{
      width: 1,
      height: 16,
      background: 'var(--border2)',
      flexShrink: 0,
      marginInline: 4,
    }} />
  )
}

export function FocusStrip() {
  const { drivers, starred, canvasFocus, setCanvasFocus, getTeamColor } = useDriverStore()
  const { data: positions } = usePositions()
  const [panelOpen, setPanelOpen] = useState(false)

  const starredDrivers = starred
    .map((num) => drivers.find((d) => d.driver_number === num))
    .filter(Boolean)

  function getPosition(driverNumber: number): number | null {
    if (!positions) return null
    return positions.find((p) => p.driver_number === driverNumber)?.position ?? null
  }

  return (
    <>
      <div style={{
        height: 32,
        background: 'var(--bg2)',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        paddingInline: 12,
        gap: 6,
        overflowX: 'auto',
        flexShrink: 0,
      }}>
        {/* Label */}
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: 8,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--muted2)',
          flexShrink: 0,
        }}>
          Focus
        </span>

        {/* FOCUS chip — inherit mode */}
        <Chip
          label="Focus"
          color="var(--green)"
          active={canvasFocus === null}
          onClick={() => setCanvasFocus(null)}
        />

        <Divider />

        {/* Position chips */}
        {(['P1', 'P2', 'P3', 'P4', 'P5'] as const).map((p) => (
          <Chip key={p} label={p} color="var(--gold)" />
        ))}

        {/* GAP chips */}
        <Chip label="GAP+1" color="var(--gold)" />
        <Chip label="GAP−1" color="var(--gold)" />

        <Divider />

        {/* Starred driver badges */}
        {starredDrivers.map((driver) => {
          if (!driver) return null
          const pos = getPosition(driver.driver_number)
          const color = getTeamColor(driver.driver_number)
          const isFocused = canvasFocus === driver.driver_number

          return (
            <button
              key={driver.driver_number}
              onClick={() => setCanvasFocus(isFocused ? null : driver.driver_number)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 7px',
                borderRadius: 3,
                border: `0.5px solid ${isFocused ? color : `${color}44`}`,
                background: isFocused ? `${color}22` : 'transparent',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.12s',
              }}
            >
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                letterSpacing: '0.08em',
                color: isFocused ? 'var(--white)' : 'var(--muted)',
                textTransform: 'uppercase',
              }}>
                {driver.name_acronym}
              </span>
              {pos != null && (
                <span style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 7,
                  color: 'var(--muted2)',
                }}>
                  P{pos}
                </span>
              )}
            </button>
          )
        })}

        {/* More button */}
        <button
          onClick={() => setPanelOpen(true)}
          style={{
            padding: '2px 8px',
            borderRadius: 3,
            border: '0.5px solid var(--border2)',
            background: 'transparent',
            fontFamily: 'var(--mono)',
            fontSize: 9,
            letterSpacing: '0.1em',
            color: 'var(--muted)',
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          + more
        </button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Count */}
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: 8,
          letterSpacing: '0.1em',
          color: 'var(--muted2)',
          flexShrink: 0,
        }}>
          {starred.length} starred
        </span>
      </div>

      {panelOpen && <DriverManagerPanel onClose={() => setPanelOpen(false)} />}
    </>
  )
}
