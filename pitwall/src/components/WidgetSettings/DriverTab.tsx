import { useState } from 'react'
import type { DriverContext } from '../../store/workspaceStore'
import { useDriverStore } from '../../store/driverStore'
import { usePositions } from '../../hooks/usePositions'
import { DriverManagerPanel } from '../DriverManager/DriverManagerPanel'

interface DriverTabProps {
  value: DriverContext
  onChange: (ctx: DriverContext) => void
  widgetId: string
}

function ContextChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string
  color: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px',
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
      }}
    >
      {label}
    </button>
  )
}

function Divider() {
  return (
    <div style={{
      width: '100%',
      height: 1,
      background: 'var(--border)',
      marginBlock: 8,
    }} />
  )
}

export function DriverTab({ value, onChange }: DriverTabProps) {
  const { drivers, starred, getTeamColor } = useDriverStore()
  const { data: positions } = usePositions()
  const [panelOpen, setPanelOpen] = useState(false)

  const starredDrivers = starred
    .map((num) => drivers.find((d) => d.driver_number === num))
    .filter(Boolean)

  function getPos(driverNumber: number): number | null {
    return positions?.find((p) => p.driver_number === driverNumber)?.position ?? null
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0' }}>
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: 8,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--muted2)',
          marginBottom: 6,
        }}>
          Driver target
        </div>

        {/* FOCUS chip */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          <ContextChip
            label="Focus"
            color="var(--green)"
            active={value === 'FOCUS'}
            onClick={() => onChange('FOCUS')}
          />
        </div>

        <Divider />

        {/* Position chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {(['P1', 'P2', 'P3', 'P4', 'P5'] as const).map((p) => (
            <ContextChip
              key={p}
              label={p}
              color="var(--gold)"
              active={value === p}
              onClick={() => onChange(p)}
            />
          ))}
          <ContextChip
            label="GAP+1"
            color="var(--gold)"
            active={value === 'GAP+1'}
            onClick={() => onChange('GAP+1')}
          />
          <ContextChip
            label="GAP−1"
            color="var(--gold)"
            active={value === 'GAP-1'}
            onClick={() => onChange('GAP-1')}
          />
        </div>

        <Divider />

        {/* Starred driver badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {starredDrivers.map((driver) => {
            if (!driver) return null
            const color = getTeamColor(driver.driver_number)
            const pinnedCtx: DriverContext = `PINNED:${driver.driver_number}`
            const isActive = value === pinnedCtx
            const pos = getPos(driver.driver_number)

            return (
              <button
                key={driver.driver_number}
                onClick={() => onChange(pinnedCtx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 8px',
                  borderRadius: 3,
                  border: `0.5px solid ${isActive ? color : `${color}44`}`,
                  background: isActive ? `${color}22` : 'transparent',
                  cursor: 'pointer',
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
                  textTransform: 'uppercase',
                  color: isActive ? 'var(--white)' : 'var(--muted)',
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

          <button
            onClick={() => setPanelOpen(true)}
            style={{
              padding: '4px 8px',
              borderRadius: 3,
              border: '0.5px solid var(--border2)',
              background: 'transparent',
              fontFamily: 'var(--mono)',
              fontSize: 9,
              letterSpacing: '0.1em',
              color: 'var(--muted)',
              cursor: 'pointer',
            }}
          >
            + more
          </button>
        </div>

        {/* Current selection display */}
        <div style={{
          marginTop: 8,
          padding: '6px 10px',
          background: 'var(--bg)',
          borderRadius: 3,
          border: '0.5px solid var(--border)',
        }}>
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: 8,
            color: 'var(--muted2)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Current: {value}
          </span>
        </div>
      </div>

      {panelOpen && <DriverManagerPanel onClose={() => setPanelOpen(false)} />}
    </>
  )
}
