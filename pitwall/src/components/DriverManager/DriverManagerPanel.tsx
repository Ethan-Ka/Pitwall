import { useDriverStore } from '../../store/driverStore'
import { usePositions } from '../../hooks/usePositions'
import { DriverCard } from './DriverCard'

interface DriverManagerPanelProps {
  onClose: () => void
}

export function DriverManagerPanel({ onClose }: DriverManagerPanelProps) {
  const { drivers, starred, canvasFocus, setCanvasFocus, toggleStar, getTeamColor } = useDriverStore()
  const { data: positions } = usePositions()

  function getPosition(driverNumber: number): number | null {
    if (!positions) return null
    return positions.find((p) => p.driver_number === driverNumber)?.position ?? null
  }

  const starredDrivers = starred
    .map((num) => drivers.find((d) => d.driver_number === num))
    .filter(Boolean)

  // Group all drivers by team
  const teamMap = new Map<string, typeof drivers>()
  for (const d of drivers) {
    const existing = teamMap.get(d.team_name) ?? []
    teamMap.set(d.team_name, [...existing, d])
  }

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 80,
      }}
    >
      {/* Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 680,
          maxHeight: 'calc(100vh - 120px)',
          background: 'var(--bg3)',
          border: '0.5px solid var(--border2)',
          borderRadius: 6,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '14px 16px',
          borderBottom: '0.5px solid var(--border)',
          flexShrink: 0,
          gap: 12,
        }}>
          <span style={{
            fontFamily: 'var(--cond)',
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '0.04em',
            flex: 1,
          }}>
            Driver Manager
          </span>
          <button
            style={{
              padding: '4px 10px',
              borderRadius: 3,
              border: '0.5px solid var(--border2)',
              background: 'var(--bg4)',
              fontFamily: 'var(--mono)',
              fontSize: 8,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              cursor: 'pointer',
            }}
          >
            Team colors
          </button>
          <button
            style={{
              padding: '4px 10px',
              borderRadius: 3,
              border: '0.5px solid var(--border2)',
              background: 'var(--bg4)',
              fontFamily: 'var(--mono)',
              fontSize: 8,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              cursor: 'pointer',
            }}
          >
            Import season
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              fontSize: 16,
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: 16 }}>
          {/* Canvas focus strip (embedded) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 20,
            flexWrap: 'wrap',
          }}>
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: 8,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--muted2)',
              marginRight: 4,
            }}>
              Canvas focus
            </span>
            <FocusChip
              label="Inherit"
              color="var(--green)"
              active={canvasFocus === null}
              onClick={() => setCanvasFocus(null)}
            />
            {starredDrivers.map((driver) => {
              if (!driver) return null
              const color = getTeamColor(driver.driver_number)
              const isFocused = canvasFocus === driver.driver_number
              return (
                <FocusChip
                  key={driver.driver_number}
                  label={driver.name_acronym}
                  color={color}
                  active={isFocused}
                  onClick={() => setCanvasFocus(isFocused ? null : driver.driver_number)}
                />
              )
            })}
          </div>

          {/* Starred drivers section */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontFamily: 'var(--mono)',
              fontSize: 8,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--muted2)',
              marginBottom: 10,
            }}>
              Starred drivers — {starred.length}
            </div>
            {starredDrivers.length === 0 ? (
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                color: 'var(--muted2)',
                padding: '12px 0',
              }}>
                No starred drivers. Star drivers from the grid below.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {starredDrivers.map((driver) => {
                  if (!driver) return null
                  return (
                    <DriverCard
                      key={driver.driver_number}
                      driver={driver}
                      position={getPosition(driver.driver_number)}
                      isStarred={true}
                      onToggleStar={() => toggleStar(driver.driver_number)}
                      onSetFocus={() => setCanvasFocus(
                        canvasFocus === driver.driver_number ? null : driver.driver_number
                      )}
                      isCanvasFocus={canvasFocus === driver.driver_number}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* All drivers — grouped by team */}
          <div>
            <div style={{
              fontFamily: 'var(--mono)',
              fontSize: 8,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--muted2)',
              marginBottom: 12,
            }}>
              All drivers — 2025 season
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
            {Array.from(teamMap.entries()).map(([teamName, teamDrivers]) => {
              const teamColor = getTeamColor(teamDrivers[0].driver_number)
              return (
                <div key={teamName} style={{ minWidth: 160 }}>
                  {/* Team label */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                  }}>
                    <div style={{
                      width: 12,
                      height: 8,
                      borderRadius: 1,
                      background: teamColor,
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 9,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--muted)',
                    }}>
                      {teamName}
                    </span>
                  </div>
                  {/* Driver cards */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {teamDrivers.map((driver) => (
                      <DriverCard
                        key={driver.driver_number}
                        driver={driver}
                        position={getPosition(driver.driver_number)}
                        isStarred={starred.includes(driver.driver_number)}
                        onToggleStar={() => toggleStar(driver.driver_number)}
                        onSetFocus={() => setCanvasFocus(
                          canvasFocus === driver.driver_number ? null : driver.driver_number
                        )}
                        isCanvasFocus={canvasFocus === driver.driver_number}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
            </div>

            {drivers.length === 0 && (
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                color: 'var(--muted2)',
                padding: '12px 0',
              }}>
                No driver data. Select an active session to load drivers.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FocusChip({
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
        padding: '3px 8px',
        borderRadius: 3,
        border: `0.5px solid ${active ? color : `${color}44`}`,
        background: active ? `${color}22` : 'transparent',
        fontFamily: 'var(--mono)',
        fontSize: 9,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: active ? color : 'var(--muted)',
        cursor: 'pointer',
        transition: 'all 0.12s',
      }}
    >
      {label}
    </button>
  )
}
