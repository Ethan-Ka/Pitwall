export const CHART_COLORS = {
  grid: 'rgba(255,255,255,0.04)',
  axis: '#6B6B70',
  bg: '#1E1E20',
  muted: '#858590',
} as const

export const CHART_AXIS_TICK = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 8,
  fill: '#6B6B70',
}

export const CHART_MARGINS = { top: 6, right: 10, left: 0, bottom: 2 }

interface TooltipEntry {
  name?: string
  value?: number | null
  color?: string
}

interface PitwallTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: number
  formatValue?: (v: number) => string
  formatLabel?: (t: number) => string
}

export function PitwallTooltip({ active, payload, label, formatValue, formatLabel }: PitwallTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: '#1E1E20',
        border: '0.5px solid rgba(255,255,255,0.1)',
        borderRadius: 3,
        padding: '5px 8px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 9,
        lineHeight: 1.6,
        pointerEvents: 'none',
      }}
    >
      {label != null && (
        <div style={{ color: '#858590', marginBottom: 2 }}>
          {formatLabel ? formatLabel(label) : `${Number(label).toFixed(1)}m`}
        </div>
      )}
      {payload.map((entry, i) =>
        entry.value != null ? (
          <div key={i} style={{ color: entry.color }}>
            {entry.name}: {formatValue ? formatValue(entry.value) : entry.value.toFixed(3)}
          </div>
        ) : null
      )}
    </div>
  )
}
