import { useEffect, useRef, useState } from 'react'

export interface DriverOption {
  driver_number: number
  name_acronym: string
  teamColor: string
}

interface DriverChipPickerProps {
  value: number | null
  options: DriverOption[]
  onChange: (driverNumber: number | null) => void
  align?: 'left' | 'right'
  placeholder?: string
}

export function DriverChipPicker({
  value,
  options,
  onChange,
  align = 'left',
  placeholder = 'Pick driver',
}: DriverChipPickerProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = options.find((d) => d.driver_number === value) ?? null

  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  return (
    <div ref={rootRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 7px',
          background: open ? 'var(--bg)' : 'var(--bg4)',
          border: `0.5px solid ${selected ? selected.teamColor + '88' : 'var(--border)'}`,
          borderRadius: 3,
          cursor: 'pointer',
          justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
          flexDirection: align === 'right' ? 'row-reverse' : 'row',
          transition: 'border-color 0.12s, background 0.12s',
        }}
      >
        {selected ? (
          <>
            <div
              style={{
                width: 3,
                height: 14,
                borderRadius: 2,
                background: selected.teamColor,
                boxShadow: `0 0 5px ${selected.teamColor}99`,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--cond)',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--white)',
                lineHeight: 1,
                letterSpacing: '0.02em',
              }}
            >
              {selected.name_acronym}
            </span>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 7,
                color: 'var(--muted2)',
                marginLeft: 'auto',
              }}
            >
              #{selected.driver_number}
            </span>
          </>
        ) : (
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 8,
              color: 'var(--muted2)',
              letterSpacing: '0.08em',
            }}
          >
            {placeholder}
          </span>
        )}
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 8,
            color: 'var(--muted2)',
            marginLeft: align === 'right' ? 0 : 'auto',
            marginRight: align === 'right' ? 'auto' : 0,
            lineHeight: 1,
          }}
        >
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: align === 'right' ? 'auto' : 0,
            right: align === 'right' ? 0 : 'auto',
            zIndex: 500,
            background: 'var(--bg3)',
            border: '0.5px solid var(--border2)',
            borderRadius: 5,
            padding: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
            minWidth: 200,
            maxWidth: 260,
          }}
        >
          {selected && (
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false) }}
              style={{
                display: 'block',
                width: '100%',
                marginBottom: 6,
                padding: '3px 6px',
                background: 'transparent',
                border: '0.5px solid var(--border)',
                borderRadius: 3,
                fontFamily: 'var(--mono)',
                fontSize: 7,
                color: 'var(--muted2)',
                cursor: 'pointer',
                letterSpacing: '0.08em',
                textAlign: 'left',
              }}
            >
              Clear selection
            </button>
          )}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 5,
            }}
          >
            {options.map((d) => {
              const isSelected = d.driver_number === value
              return (
                <button
                  key={d.driver_number}
                  type="button"
                  onClick={() => { onChange(d.driver_number); setOpen(false) }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    padding: '5px 3px',
                    background: isSelected ? `${d.teamColor}22` : 'var(--bg4)',
                    border: `0.5px solid ${isSelected ? d.teamColor + 'aa' : 'var(--border)'}`,
                    borderRadius: 4,
                    cursor: 'pointer',
                    transition: 'background 0.1s, border-color 0.1s',
                  }}
                  title={`${d.name_acronym} #${d.driver_number}`}
                >
                  <div
                    style={{
                      width: '100%',
                      height: 2,
                      borderRadius: 1,
                      background: d.teamColor,
                      opacity: isSelected ? 1 : 0.6,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--cond)',
                      fontSize: 10,
                      fontWeight: 700,
                      color: isSelected ? 'var(--white)' : 'var(--muted)',
                      letterSpacing: '0.02em',
                      lineHeight: 1,
                    }}
                  >
                    {d.name_acronym}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
