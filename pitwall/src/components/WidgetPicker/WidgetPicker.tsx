import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDraggingStore } from '../../store/draggingStore'
import { WIDGET_DEFAULTS } from '../../widgets/registry'
import { WIDGET_PICKER_LIST, WIDGET_CATEGORY_MAP as MANIFEST_CATEGORY_MAP } from '../../widgets/manifest'
import type { WidgetCategory as ManifestWidgetCategory } from '../../widgets/manifest'

const GRID_COLS = 24
const GRID_ROW_HEIGHT = 40
const GRID_MARGIN_X = 4
const GRID_MARGIN_Y = 4

interface WidgetPickerProps {
  onClose: () => void
  onAdd: (type: string) => void
}

interface WidgetDef {
  type: string
  label: string
  description: string
  color: string
}

type WidgetCategory = ManifestWidgetCategory

const CATEGORY_ORDER: WidgetCategory[] = [
  'Timing',
  'Telemetry',
  'Race Control',
  'Strategy',
  'Weather',
  'Track',
  'Radio',
  'Standings',
]

const CATEGORY_COLORS: Record<WidgetCategory, string> = {
  Timing: 'var(--red)',
  Telemetry: 'var(--purple)',
  'Race Control': 'var(--orange)',
  Strategy: 'var(--gold)',
  Weather: 'var(--cyan)',
  Track: 'var(--blue)',
  Radio: 'var(--pink)',
  Standings: 'var(--green)',
}

const WIDGET_CATEGORY_MAP: Record<string, WidgetCategory> = MANIFEST_CATEGORY_MAP

function getWidgetCategory(type: string): WidgetCategory {
  return WIDGET_CATEGORY_MAP[type] ?? 'Telemetry'
}

function getWidgetInitials(label: string): string {
  const words = label
    .replace(/\([^)]*\)/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return 'WG'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

function resolveCssColor(color: string, fallback: string): string {
  const match = /^var\((--[^)]+)\)$/.exec(color.trim())
  if (!match) return color
  const resolved = getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim()
  return resolved || fallback
}

function getDragPreviewDimensions(type: string): { width: number; height: number; w: number; h: number } {
  const defaults = WIDGET_DEFAULTS[type] ?? { w: 6, h: 6 }
  const canvas = document.querySelector<HTMLElement>('[data-canvas-dropzone="true"]')
  const widthPx = canvas?.clientWidth ?? 1200
  const colWidth = (widthPx - GRID_MARGIN_X * (GRID_COLS - 1)) / GRID_COLS

  if (!Number.isFinite(colWidth) || colWidth <= 0) {
    return {
      width: Math.max(120, defaults.w * 20),
      height: Math.max(72, defaults.h * 12),
      w: defaults.w,
      h: defaults.h,
    }
  }

  const exactWidth = Math.max(96, Math.round(defaults.w * colWidth + (defaults.w - 1) * GRID_MARGIN_X))
  const exactHeight = Math.max(48, Math.round(defaults.h * GRID_ROW_HEIGHT + (defaults.h - 1) * GRID_MARGIN_Y))

  return {
    width: exactWidth,
    height: exactHeight,
    w: defaults.w,
    h: defaults.h,
  }
}

function emitPickerDragHover(active: boolean) {
  window.dispatchEvent(new CustomEvent('pitwall:picker-drag-hover', { detail: { active } }))
}

function createCanvasDragImage(label: string, color: string, width: number, height: number): HTMLCanvasElement {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  ctx.scale(dpr, dpr)

  // Background fill
  ctx.fillStyle = 'rgba(12, 14, 20, 0.92)'
  ctx.fillRect(0, 0, width, height)

  // Subtle inner highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'
  ctx.lineWidth = 1
  ctx.strokeRect(1, 1, Math.max(0, width - 2), Math.max(0, height - 2))

  // Strong outer border so large previews always retain an obvious edge.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, Math.max(0, width - 2), Math.max(0, height - 2))

  // Dashed accent border.
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.setLineDash([10, 7])
  ctx.strokeRect(4, 4, Math.max(0, width - 8), Math.max(0, height - 8))
  ctx.setLineDash([])

  // Label
  ctx.fillStyle = '#f5f7fb'
  ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, width / 2, height / 2)

  return canvas
}

const WIDGETS: WidgetDef[] = WIDGET_PICKER_LIST

// --- Mini preview components ---

function PreviewLapDeltaTower() {
  const rows = [
    { pos: 1, abbr: 'VER', gap: '1:23.4', color: '#3b82f6' },
    { pos: 2, abbr: 'NOR', gap: '+0.8', color: '#f97316' },
    { pos: 3, abbr: 'LEC', gap: '+1.2', color: '#ef4444' },
    { pos: 4, abbr: 'HAM', gap: '+3.4', color: '#14b8a6' },
  ]
  return (
    <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {rows.map((row) => (
        <div key={row.pos} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 3, height: 14, borderRadius: 1, background: row.color, flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--muted2)', width: 10, textAlign: 'right' }}>
            {row.pos}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--white)', width: 24 }}>
            {row.abbr}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 7, color: row.pos === 1 ? 'var(--white)' : 'var(--muted)' }}>
            {row.gap}
          </span>
        </div>
      ))}
    </div>
  )
}

function PreviewRunningOrderStrip() {
  const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#14b8a6','#f59e0b']
  return (
    <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        {COLORS.map((c, i) => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 5 }}>
        {COLORS.map((_, i) => (
          <span key={i} style={{ fontFamily: 'var(--mono)', fontSize: 5, color: 'var(--muted2)', width: 6, textAlign: 'center' }}>
            P{i + 1}
          </span>
        ))}
      </div>
    </div>
  )
}

function PreviewRaceControlFeed() {
  const rows = [
    { ts: '14:23:01', msg: 'GREEN FLAG — RACING' },
    { ts: '14:18:44', msg: 'YELLOW FLAG — T12' },
    { ts: '14:15:02', msg: 'SC DEPLOYED' },
  ]
  return (
    <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--muted2)', flexShrink: 0 }}>{row.ts}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--muted)', lineHeight: 1.3 }}>{row.msg}</span>
        </div>
      ))}
    </div>
  )
}

function PreviewWeatherDashboard() {
  const metrics = [
    { label: 'AIR', value: '22°C' },
    { label: 'TRACK', value: '38°C' },
    { label: 'HUM', value: '54%' },
    { label: 'WIND', value: '12' },
    { label: 'DIR', value: '270°' },
    { label: 'RAIN', value: '0mm' },
  ]
  return (
    <div style={{ padding: '6px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
      {metrics.map((m) => (
        <div key={m.label} style={{
          background: 'var(--bg3)',
          borderRadius: 2,
          padding: '3px 4px',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 6, color: 'var(--muted2)', letterSpacing: '0.08em' }}>{m.label}</span>
          <span style={{ fontFamily: 'var(--cond)', fontSize: 12, fontWeight: 700, color: 'var(--white)', lineHeight: 1 }}>{m.value}</span>
        </div>
      ))}
    </div>
  )
}

function PreviewTyreIntelligence() {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      padding: '6px 10px',
    }}>
      <div style={{
        background: '#eab308',
        borderRadius: 2,
        padding: '2px 8px',
        fontFamily: 'var(--mono)',
        fontSize: 8,
        fontWeight: 700,
        color: '#000',
        letterSpacing: '0.08em',
      }}>
        MEDIUM
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--muted2)' }}>Age 14 laps</span>
      <div style={{ width: '100%', height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: '60%', height: '100%', background: '#f59e0b', borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 6, color: 'var(--red)', letterSpacing: '0.06em' }}>
        Cliff: lap 28 ~EST
      </span>
    </div>
  )
}

function PreviewFullTrackMap() {
  const dots = [
    { cx: 80, cy: 30, color: '#ef4444' },
    { cx: 135, cy: 22, color: '#f97316' },
    { cx: 168, cy: 50, color: '#3b82f6' },
    { cx: 140, cy: 72, color: '#22c55e' },
    { cx: 55, cy: 62, color: '#8b5cf6' },
  ]
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
      <svg viewBox="0 0 200 90" style={{ width: '100%', height: '100%' }}>
        {/* Simplified Silverstone-ish oval path */}
        <path
          d="M 30 45 Q 30 15 70 12 L 130 10 Q 170 8 175 30 L 178 55 Q 178 78 145 80 L 60 82 Q 28 80 28 60 Z"
          fill="none"
          stroke="var(--border2)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {dots.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={4} fill={d.color} />
        ))}
      </svg>
    </div>
  )
}

function PreviewWeatherRadar() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Grid background */}
      <svg viewBox="0 0 120 75" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {/* Grid lines */}
        {[0,1,2,3,4,5].map((i) => (
          <line key={`h${i}`} x1={0} y1={i * 15} x2={120} y2={i * 15} stroke="var(--border)" strokeWidth="0.5" />
        ))}
        {[0,1,2,3,4,5,6,7].map((i) => (
          <line key={`v${i}`} x1={i * 17} y1={0} x2={i * 17} y2={75} stroke="var(--border)" strokeWidth="0.5" />
        ))}
        {/* Radar sweep arc */}
        <path
          d="M 60 37 L 60 10 A 27 27 0 0 1 85 50 Z"
          fill="rgba(34,197,94,0.15)"
          stroke="rgba(34,197,94,0.4)"
          strokeWidth="0.5"
        />
        {/* Center dot */}
        <circle cx={60} cy={37} r={2.5} fill="#22c55e" opacity={0.8} />
      </svg>
      {/* Label */}
      <span style={{
        position: 'absolute',
        bottom: 6,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontFamily: 'var(--mono)',
        fontSize: 6,
        color: 'var(--muted2)',
        letterSpacing: '0.1em',
      }}>
        SILVERSTONE
      </span>
    </div>
  )
}

function PreviewStandingsBoard() {
  const rows = [
    { pos: 1, code: 'NOR', pts: 25, color: '#f97316' },
    { pos: 2, code: 'VER', pts: 18, color: '#3b82f6' },
    { pos: 3, code: 'LEC', pts: 15, color: '#ef4444' },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 4,
      height: '100%',
      padding: '5px 6px',
      boxSizing: 'border-box',
    }}>
      {[0, 1].map((panel) => (
        <div
          key={panel}
          style={{
            border: '0.5px solid var(--border)',
            borderRadius: 2,
            overflow: 'hidden',
            background: 'var(--bg3)',
          }}
        >
          <div style={{
            height: 11,
            borderBottom: '0.5px solid var(--border)',
            background: 'var(--bg4)',
            fontFamily: 'var(--mono)',
            fontSize: 5,
            color: 'var(--muted2)',
            letterSpacing: '0.08em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {panel === 0 ? 'DRIVERS' : 'TEAMS'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {rows.map((row) => (
              <div key={`${panel}-${row.code}`} style={{
                height: 11,
                borderBottom: '0.5px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: '8px 2px 1fr 10px',
                alignItems: 'center',
                columnGap: 3,
                padding: '0 4px',
                boxSizing: 'border-box',
              }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 5, color: 'var(--muted2)', textAlign: 'right' }}>
                  {row.pos}
                </span>
                <div style={{ width: 2, height: 7, borderRadius: 1, background: row.color }} />
                <span style={{ fontFamily: 'var(--cond)', fontSize: 8, color: 'var(--white)', lineHeight: 1 }}>
                  {panel === 0 ? row.code : `T${row.pos}`}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 5, color: 'var(--muted)' }}>
                  {row.pts}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function PreviewLastLapCard() {
  return (
    <div style={{ height: '100%', padding: '7px 9px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 6, color: 'var(--muted2)', letterSpacing: '0.1em' }}>LAST LAP (L47)</span>
      <span style={{ fontFamily: 'var(--cond)', fontSize: 18, fontWeight: 700, color: 'var(--white)', lineHeight: 1 }}>1:28.642</span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
        {['S1 28.4', 'S2 31.1', 'S3 29.1'].map((v) => (
          <span key={v} style={{ fontFamily: 'var(--mono)', fontSize: 6, color: 'var(--muted)', textAlign: 'center' }}>{v}</span>
        ))}
      </div>
    </div>
  )
}

function PreviewLiveLapTimeCard() {
  return (
    <div style={{ height: '100%', padding: '7px 9px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 6, color: 'var(--muted2)', letterSpacing: '0.1em' }}>LIVE LAP (L48)</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontFamily: 'var(--cond)', fontSize: 8, color: 'var(--muted2)', opacity: 0.4, lineHeight: 1 }}>1:28.642</span>
        <span style={{ fontFamily: 'var(--cond)', fontSize: 22, fontWeight: 700, color: '#e8002d', lineHeight: 1, textShadow: '0 0 8px #e8002d44' }}>1:14.3__</span>
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 6, color: 'var(--muted2)', letterSpacing: '0.1em' }}>LIVE TIMER</span>
    </div>
  )
}

function PreviewGapEvolutionChart() {
  return (
    <div style={{ height: '100%', padding: '7px' }}>
      <svg viewBox="0 0 120 72" style={{ width: '100%', height: '100%' }}>
        {[12, 24, 36, 48, 60].map((y) => (
          <line key={y} x1={0} y1={y} x2={120} y2={y} stroke="var(--border)" strokeWidth="0.5" />
        ))}
        <polyline fill="none" stroke="#ef4444" strokeWidth="2" points="2,56 20,50 36,44 52,48 70,36 86,30 102,26 118,20" />
      </svg>
    </div>
  )
}

function PreviewStintPaceComparison() {
  const bars = [82, 74, 66, 58]
  return (
    <div style={{ height: '100%', padding: '8px', display: 'flex', flexDirection: 'column', gap: 5, justifyContent: 'center' }}>
      {bars.map((w, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '18px 1fr 26px', alignItems: 'center', gap: 5 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 6, color: 'var(--muted2)' }}>L{i + 8}</span>
          <div style={{ height: 4, borderRadius: 3, background: 'var(--bg2)', overflow: 'hidden' }}>
            <div style={{ width: `${w}%`, height: '100%', background: i % 2 ? '#f97316' : '#3b82f6' }} />
          </div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 6, color: 'var(--muted)' }}>{(88 + i / 10).toFixed(1)}</span>
        </div>
      ))}
    </div>
  )
}

function PreviewHeadToHeadDelta() {
  return (
    <div style={{ height: '100%', padding: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
      {[
        { code: 'NOR', color: '#f97316', delta: '-0.231' },
        { code: 'VER', color: '#3b82f6', delta: '+0.231' },
      ].map((d) => (
        <div key={d.code} style={{ background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: 3, padding: '5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 3, height: 12, borderRadius: 1, background: d.color }} />
            <span style={{ fontFamily: 'var(--cond)', fontSize: 10, color: 'var(--white)' }}>{d.code}</span>
          </div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--muted)' }}>{d.delta}</span>
        </div>
      ))}
    </div>
  )
}

function PreviewSectorMiniCards() {
  return (
    <div style={{ height: '100%', padding: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
      {[
        { key: 'S1', value: '28.4', color: '#a3e635' },
        { key: 'S2', value: '31.1', color: '#facc15' },
        { key: 'S3', value: '29.3', color: '#f87171' },
      ].map((s) => (
        <div key={s.key} style={{ background: 'var(--bg3)', borderRadius: 3, border: '0.5px solid var(--border)', padding: '4px' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 6, color: 'var(--muted2)' }}>{s.key}</span>
          <div style={{ width: '100%', height: 2, background: s.color, borderRadius: 2, margin: '2px 0' }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--white)' }}>{s.value}</span>
        </div>
      ))}
    </div>
  )
}

function PreviewSpeedGauge() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      <div style={{ width: 50, height: 28, borderTopLeftRadius: 50, borderTopRightRadius: 50, border: '2px solid var(--border2)', borderBottom: 'none', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 24, bottom: 0, width: 2, height: 20, background: '#ef4444', transform: 'rotate(35deg)', transformOrigin: 'bottom center' }} />
      </div>
      <span style={{ fontFamily: 'var(--cond)', fontSize: 16, fontWeight: 700, color: 'var(--white)', lineHeight: 1 }}>318</span>
    </div>
  )
}

function PreviewThrottleBrakeTrace() {
  return (
    <div style={{ height: '100%', padding: '8px' }}>
      <svg viewBox="0 0 120 72" style={{ width: '100%', height: '100%' }}>
        <polyline fill="none" stroke="#22c55e" strokeWidth="2" points="2,60 20,20 38,26 56,18 74,34 92,12 118,14" />
        <polyline fill="none" stroke="#ef4444" strokeWidth="2" points="2,68 24,66 42,52 58,60 76,44 96,58 118,46" />
      </svg>
    </div>
  )
}

function PreviewGearTrace() {
  return (
    <div style={{ height: '100%', padding: '8px', display: 'flex', alignItems: 'center' }}>
      <svg viewBox="0 0 120 72" style={{ width: '100%', height: '100%' }}>
        <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points="2,64 24,64 24,54 48,54 48,40 74,40 74,24 96,24 96,10 118,10" />
      </svg>
    </div>
  )
}

function PreviewThrottleHeatmap() {
  return (
    <div style={{ height: '100%', padding: '8px', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2 }}>
      {Array.from({ length: 40 }).map((_, i) => {
        const v = (i * 37) % 100
        const color = v > 75 ? '#f97316' : v > 45 ? '#eab308' : '#22c55e'
        return <div key={i} style={{ height: 4, borderRadius: 1, background: color, opacity: 0.85 }} />
      })}
    </div>
  )
}

function PreviewERSMicroSectors() {
  return (
    <div style={{ height: '100%', padding: '8px', display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 2 }}>
      {Array.from({ length: 30 }).map((_, i) => {
        const mod = i % 10
        const color = mod < 3 ? '#22c55e' : mod < 7 ? '#facc15' : '#ef4444'
        return <div key={i} style={{ height: 5, borderRadius: 2, background: color, opacity: 0.8 }} />
      })}
    </div>
  )
}

function PreviewDRSEfficiency() {
  return (
    <div style={{ height: '100%', padding: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5 }}>
      <div style={{ height: 6, background: 'var(--bg2)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: '78%', height: '100%', background: '#22c55e' }} />
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--muted)' }}>OPEN +12.4 km/h</span>
    </div>
  )
}

function PreviewEngineModeTracker() {
  return (
    <div style={{ height: '100%', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      {['P1', 'P2', 'P3', 'P4'].map((mode, i) => (
        <div key={mode} style={{ width: 17, height: 28, borderRadius: 3, border: '0.5px solid var(--border)', background: i === 1 ? '#3b82f644' : 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 6, color: i === 1 ? 'var(--white)' : 'var(--muted2)' }}>{mode}</span>
        </div>
      ))}
    </div>
  )
}

function PreviewStrategyTimeline() {
  return (
    <div style={{ height: '100%', padding: '8px', display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}>
      {[['#eab308', '#22c55e', '#ef4444'], ['#ffffff', '#eab308', '#22c55e'], ['#f97316', '#ffffff', '#ef4444']].map((segments, i) => (
        <div key={i} style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: 'var(--bg2)' }}>
          {segments.map((c, idx) => <div key={idx} style={{ flex: 1, background: c }} />)}
        </div>
      ))}
    </div>
  )
}

function PreviewDegRateGraph() {
  return (
    <div style={{ height: '100%', padding: '8px' }}>
      <svg viewBox="0 0 120 72" style={{ width: '100%', height: '100%' }}>
        <polyline fill="none" stroke="#f97316" strokeWidth="2" points="4,14 24,18 44,24 64,34 84,48 104,58 116,66" />
      </svg>
    </div>
  )
}

function PreviewPitWindowUrgency() {
  return (
    <div style={{ height: '100%', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', border: '5px solid #ef4444', borderTopColor: 'var(--border2)', transform: 'rotate(35deg)' }} />
      <span style={{ fontFamily: 'var(--mono)', fontSize: 7, color: '#ef4444' }}>PIT NOW</span>
    </div>
  )
}

function PreviewPitStopLog() {
  return (
    <div style={{ height: '100%', padding: '8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {['NOR 22.4s', 'LEC 21.8s', 'HAM 23.1s'].map((row, i) => (
        <div key={row} style={{ display: 'grid', gridTemplateColumns: '8px 1fr', alignItems: 'center', gap: 5 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 6, color: 'var(--muted2)' }}>L{i + 15}</span>
          <div style={{ height: 9, borderRadius: 2, background: 'var(--bg3)', border: '0.5px solid var(--border)', padding: '0 4px', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 6, color: 'var(--muted)' }}>{row}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function PreviewUndercutSimulator() {
  return (
    <div style={{ height: '100%', padding: '8px', display: 'flex', flexDirection: 'column', gap: 5, justifyContent: 'center' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
        <div style={{ background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: 2, padding: '4px' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 6, color: 'var(--muted2)' }}>CURRENT</span>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--white)' }}>P4</div>
        </div>
        <div style={{ background: '#22c55e22', border: '0.5px solid #22c55e99', borderRadius: 2, padding: '4px' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 6, color: '#86efac' }}>UNDERCUT</span>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--white)' }}>P3</div>
        </div>
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 6, color: 'var(--muted2)' }}>GAIN +1.8s</span>
    </div>
  )
}

function PreviewTrackTempEvolution() {
  return (
    <div style={{ height: '100%', padding: '8px' }}>
      <svg viewBox="0 0 120 72" style={{ width: '100%', height: '100%' }}>
        <polyline fill="none" stroke="#f97316" strokeWidth="2" points="4,56 22,52 40,46 58,42 76,36 94,30 116,24" />
        <polyline fill="none" stroke="#38bdf8" strokeWidth="2" points="4,62 22,60 40,56 58,52 76,48 94,44 116,40" />
      </svg>
    </div>
  )
}

function PreviewWindDirection() {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--border2)', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 19, top: 6, width: 2, height: 24, background: '#38bdf8', transform: 'rotate(45deg)', transformOrigin: 'bottom center' }} />
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--muted)' }}>270° / 12kmh</span>
    </div>
  )
}

function PreviewSectorMap() {
  return (
    <div style={{ width: '100%', height: '100%', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 120 75" style={{ width: '100%', height: '100%' }}>
        <path d="M16 38 Q16 14 44 12 L86 12 Q104 14 104 30 L104 48 Q104 64 86 64 L32 64 Q16 62 16 48 Z" fill="none" stroke="var(--border2)" strokeWidth="4" />
        <path d="M22 30 L57 12" stroke="#eab308" strokeWidth="3" />
        <path d="M58 12 L102 32" stroke="#22c55e" strokeWidth="3" />
        <path d="M102 33 L66 64" stroke="#ef4444" strokeWidth="3" />
      </svg>
    </div>
  )
}

function PreviewOvertakeReplay() {
  return (
    <div style={{ height: '100%', padding: '8px', display: 'flex', flexDirection: 'column', gap: 5, justifyContent: 'center' }}>
      <div style={{ position: 'relative', height: 16 }}>
        <div style={{ position: 'absolute', left: 8, top: 7, width: 36, height: 3, background: '#3b82f6', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: 38, top: 7, width: 36, height: 3, background: '#f97316', borderRadius: 2 }} />
        <span style={{ position: 'absolute', left: 32, top: 0, fontFamily: 'var(--mono)', fontSize: 10, color: '#22c55e' }}>↗</span>
      </div>
      <div style={{ height: 5, background: 'var(--bg2)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: '46%', height: '100%', background: 'var(--red)' }} />
      </div>
    </div>
  )
}

function PreviewRadioScanner() {
  return (
    <div style={{ height: '100%', padding: '8px', display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}>
      {[0, 1, 2, 3].map((row) => (
        <div key={row} style={{ height: 6, background: 'var(--bg2)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${35 + row * 15}%`, height: '100%', background: '#ec4899' }} />
        </div>
      ))}
      <span style={{ fontFamily: 'var(--mono)', fontSize: 6, color: 'var(--muted2)' }}>CH 04 ACTIVE</span>
    </div>
  )
}

function PreviewRadioFeedText() {
  return (
    <div style={{ height: '100%', padding: '8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {['BOX THIS LAP', 'TYRES GOOD', 'COPY, PUSH NOW'].map((line, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '16px 1fr', gap: 4 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 6, color: 'var(--muted2)' }}>14:{22 + i}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 6, color: 'var(--muted)' }}>{line}</span>
        </div>
      ))}
    </div>
  )
}

function PreviewStandingsTable() {
  const rows = ['1 NOR 250', '2 VER 238', '3 LEC 191', '4 HAM 180']
  return (
    <div style={{ height: '100%', padding: '7px', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 26px', fontFamily: 'var(--mono)', fontSize: 6, color: 'var(--muted2)' }}>
        <span>DRIVER</span>
        <span>PTS</span>
      </div>
      {rows.map((row) => (
        <div key={row} style={{ display: 'grid', gridTemplateColumns: '1fr 26px', borderBottom: '0.5px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--white)' }}>{row.slice(0, 7)}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--muted)' }}>{row.slice(-3)}</span>
        </div>
      ))}
    </div>
  )
}

function PreviewChampionshipCalculator() {
  return (
    <div style={{ height: '100%', padding: '8px', display: 'flex', flexDirection: 'column', gap: 5, justifyContent: 'center' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
        <div style={{ background: 'var(--bg3)', borderRadius: 2, border: '0.5px solid var(--border)', padding: '4px' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 6, color: 'var(--muted2)' }}>NOR</span>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--white)' }}>+18</div>
        </div>
        <div style={{ background: 'var(--bg3)', borderRadius: 2, border: '0.5px solid var(--border)', padding: '4px' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 6, color: 'var(--muted2)' }}>VER</span>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--white)' }}>+15</div>
        </div>
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 6, color: '#86efac' }}>TITLE SWING +3</span>
    </div>
  )
}

function PreviewPointsDeltaTracker() {
  return (
    <div style={{ height: '100%', padding: '8px' }}>
      <svg viewBox="0 0 120 72" style={{ width: '100%', height: '100%' }}>
        <line x1={4} y1={36} x2={116} y2={36} stroke="var(--border)" strokeWidth="1" />
        <polyline fill="none" stroke="#22c55e" strokeWidth="2" points="4,42 20,38 36,34 52,30 68,26 84,22 100,18 116,14" />
      </svg>
    </div>
  )
}

function PreviewCarVisualization() {
  return (
    <div style={{ height: '100%', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 130 72" style={{ width: '100%', height: '100%' }}>
        <rect x={20} y={30} width={80} height={12} rx={4} fill="#3b82f6" opacity={0.8} />
        <rect x={40} y={24} width={28} height={8} rx={2} fill="#60a5fa" />
        <circle cx={30} cy={48} r={8} fill="#111" />
        <circle cx={84} cy={48} r={8} fill="#111" />
        <line x1={20} y1={20} x2={110} y2={20} stroke="var(--border2)" strokeWidth="1" strokeDasharray="3 2" />
      </svg>
    </div>
  )
}

const PREVIEW_MAP: Record<string, () => React.ReactElement> = {
  LapDeltaTower: PreviewLapDeltaTower,
  LastLapCard: PreviewLastLapCard,
  LiveLapTimeCard: PreviewLiveLapTimeCard,
  GapEvolutionChart: PreviewGapEvolutionChart,
  StintPaceComparison: PreviewStintPaceComparison,
  HeadToHeadDelta: PreviewHeadToHeadDelta,
  SectorMiniCards: PreviewSectorMiniCards,
  SpeedGauge: PreviewSpeedGauge,
  ThrottleBrakeTrace: PreviewThrottleBrakeTrace,
  GearTrace: PreviewGearTrace,
  ThrottleHeatmap: PreviewThrottleHeatmap,
  ERSMicroSectors: PreviewERSMicroSectors,
  DRSEfficiency: PreviewDRSEfficiency,
  EngineModeTracker: PreviewEngineModeTracker,
  RunningOrderStrip: PreviewRunningOrderStrip,
  RaceControlFeed: PreviewRaceControlFeed,
  StrategyTimeline: PreviewStrategyTimeline,
  DegRateGraph: PreviewDegRateGraph,
  PitWindowUrgency: PreviewPitWindowUrgency,
  PitStopLog: PreviewPitStopLog,
  UndercutSimulator: PreviewUndercutSimulator,
  WeatherDashboard: PreviewWeatherDashboard,
  TrackTempEvolution: PreviewTrackTempEvolution,
  WindDirection: PreviewWindDirection,
  TyreIntelligence: PreviewTyreIntelligence,
  FullTrackMap: PreviewFullTrackMap,
  SectorMap: PreviewSectorMap,
  OvertakeReplay: PreviewOvertakeReplay,
  WeatherRadar: PreviewWeatherRadar,
  RadioScanner: PreviewRadioScanner,
  RadioFeedText: PreviewRadioFeedText,
  StandingsBoard: PreviewStandingsBoard,
  StandingsTable: PreviewStandingsTable,
  ChampionshipCalculator: PreviewChampionshipCalculator,
  PointsDeltaTracker: PreviewPointsDeltaTracker,
  CarVisualization: PreviewCarVisualization,
}

function WidgetCard({
  widget,
  onAdd,
  onClose,
  index,
  registerRef,
}: {
  widget: WidgetDef
  onAdd: (type: string) => void
  onClose: () => void
  index: number
  registerRef?: (type: string, node: HTMLDivElement | null) => void
}) {
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)
  const setDraggingType = useDraggingStore((s) => s.setDraggingType)
  const dragPreviewRef = useRef<HTMLCanvasElement | null>(null)

  const PreviewComponent = PREVIEW_MAP[widget.type]
  const category = getWidgetCategory(widget.type)
  const categoryColor = CATEGORY_COLORS[category]
  const initials = getWidgetInitials(widget.label)

  function handleClick() {
    onAdd(widget.type)
    onClose()
  }

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('text/plain', widget.type)

    const previewSize = getDragPreviewDimensions(widget.type)
    const previewColor = resolveCssColor(widget.color, '#e8132b')
    const preview = createCanvasDragImage(
      `${widget.label} (${previewSize.w}x${previewSize.h})`,
      previewColor,
      previewSize.width,
      previewSize.height,
    )
    preview.style.position = 'fixed'
    preview.style.top = '-9999px'
    preview.style.left = '-9999px'
    preview.style.pointerEvents = 'none'
    document.body.appendChild(preview)
    dragPreviewRef.current = preview
    e.dataTransfer.setDragImage(preview, preview.offsetWidth / 2, preview.offsetHeight / 2)

    emitPickerDragHover(false)
    setDraggingType(widget.type)
    setDragging(true)
  }

  function handleDragEnd() {
    emitPickerDragHover(false)
    setDraggingType(null)
    setDragging(false)
    if (dragPreviewRef.current) {
      dragPreviewRef.current.remove()
      dragPreviewRef.current = null
    }
  }

  return (
    <div
      ref={(node) => registerRef?.(widget.type, node)}
      role="button"
      tabIndex={0}
      draggable={true}
      className="interactive-card stagger-item"
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        maxWidth: 130,
        minWidth: 0,
        height: 120,
        background: 'var(--bg4)',
        border: `0.5px solid ${categoryColor}`,
        borderRadius: 4,
        overflow: 'hidden',
        boxSizing: 'border-box',
        cursor: 'grab',
        display: 'flex',
        flexDirection: 'column',
        opacity: dragging ? 0.6 : 1,
        transition: 'box-shadow 0.12s, opacity 0.1s',
        boxShadow: hovered ? `0 0 0 0.5px ${categoryColor}` : 'none',
        flexShrink: 0,
        willChange: 'transform, opacity',
        ['--stagger-delay' as string]: `${Math.min(index * 22, 240)}ms`,
      }}
    >
      {/* Mini preview (top 75px) */}
      <div style={{
        height: 75,
        flexShrink: 0,
        background: 'var(--bg3)',
        borderBottom: '0.5px solid var(--border)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {PreviewComponent ? <PreviewComponent /> : (
          <div style={{
            width: '100%',
            height: '100%',
            background: `linear-gradient(145deg, ${widget.color}22, var(--bg3))`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 6,
                background: `${widget.color}44`,
                border: `0.5px solid ${widget.color}99`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  color: 'var(--white)',
                }}
              >
                {initials}
              </span>
            </div>
            <span
              style={{
                position: 'absolute',
                left: 6,
                bottom: 5,
                fontFamily: 'var(--mono)',
                fontSize: 6,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--muted2)',
              }}
            >
              {category}
            </span>
          </div>
        )}
      </div>

      {/* Info (bottom 45px) */}
      <div style={{
        height: 45,
        padding: '5px 7px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 2,
      }}>
        <div style={{
          fontFamily: 'var(--cond)',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--white)',
          letterSpacing: '0.01em',
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {widget.label}
        </div>
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: 8,
          color: 'var(--muted2)',
          letterSpacing: '0.04em',
          lineHeight: 1.3,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {widget.description}
        </div>
      </div>
    </div>
  )
}

export function WidgetPicker({ onClose, onAdd }: WidgetPickerProps) {
  const EXIT_MS = 220
  const [query, setQuery] = useState('')
  const [isClosing, setIsClosing] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cardRefs = useRef(new Map<string, HTMLDivElement>())
  const prevCardRectsRef = useRef(new Map<string, DOMRect>())
  const draggingType = useDraggingStore((s) => s.draggingType)

  function handleRequestClose() {
    if (isClosing) return
    setIsClosing(true)
    closeTimerRef.current = setTimeout(() => {
      onClose()
    }, EXIT_MS)
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const filtered = query.trim()
    ? WIDGETS.filter(
        (w) =>
          w.label.toLowerCase().includes(query.toLowerCase()) ||
          w.description.toLowerCase().includes(query.toLowerCase()) ||
          getWidgetCategory(w.type).toLowerCase().includes(query.toLowerCase())
      )
    : WIDGETS

  const groupedWidgets = CATEGORY_ORDER
    .map((category) => ({
      category,
      widgets: filtered.filter((widget) => getWidgetCategory(widget.type) === category),
    }))
    .filter((group) => group.widgets.length > 0)

  const visibleWidgetTypes = groupedWidgets.flatMap((group) => group.widgets.map((widget) => widget.type))

  function registerCardRef(type: string, node: HTMLDivElement | null) {
    if (!node) {
      cardRefs.current.delete(type)
      return
    }
    cardRefs.current.set(type, node)
  }

  useLayoutEffect(() => {
    const nextRects = new Map<string, DOMRect>()

    for (const type of visibleWidgetTypes) {
      const el = cardRefs.current.get(type)
      if (!el) continue
      nextRects.set(type, el.getBoundingClientRect())
    }

    for (const [type, nextRect] of nextRects) {
      const el = cardRefs.current.get(type)
      if (!el) continue

      const prevRect = prevCardRectsRef.current.get(type)
      if (!prevRect) {
        // New card: fade/scale in quickly to avoid a hard pop.
        el.style.transition = 'none'
        el.style.opacity = '0'
        el.style.transform = 'scale(0.96)'
        requestAnimationFrame(() => {
          el.style.transition = 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 220ms ease'
          el.style.opacity = '1'
          el.style.transform = 'translate(0, 0) scale(1)'
        })
        continue
      }

      const deltaX = prevRect.left - nextRect.left
      const deltaY = prevRect.top - nextRect.top

      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) continue

      // Existing card: FLIP transform for smooth reflow.
      el.style.transition = 'none'
      el.style.transform = `translate(${deltaX}px, ${deltaY}px)`
      requestAnimationFrame(() => {
        el.style.transition = 'transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1)'
        el.style.transform = 'translate(0, 0)'
      })
    }

    prevCardRectsRef.current = nextRects
  }, [visibleWidgetTypes.join('|')])

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={handleRequestClose}
        className={isClosing ? 'glass-overlay glass-overlay-exit' : 'glass-overlay'}
        style={{
          position: 'fixed',
          inset: 0,
          background: draggingType ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.35)',
          zIndex: 200,
          pointerEvents: draggingType ? 'none' : 'auto',
          backdropFilter: draggingType ? 'none' : undefined,
          WebkitBackdropFilter: draggingType ? 'none' : undefined,
          transition: 'background 170ms ease, backdrop-filter 170ms ease, -webkit-backdrop-filter 170ms ease',
        }}
      />

      {/* Slide-in panel */}
      <div
        className={isClosing ? 'animated-slide-right-exit' : 'animated-slide-right'}
        onDragEnter={(e) => {
          // Explicitly consume drag events over the picker so the canvas drop preview clears.
          e.preventDefault()
          e.stopPropagation()
          e.dataTransfer.dropEffect = 'none'
          emitPickerDragHover(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          e.dataTransfer.dropEffect = 'none'
          emitPickerDragHover(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.stopPropagation()
          emitPickerDragHover(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          emitPickerDragHover(false)
        }}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 312,
          background: 'var(--bg3)',
          borderLeft: '0.5px solid var(--border2)',
          zIndex: 201,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px 10px',
            borderBottom: '0.5px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <div>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--white)',
                display: 'block',
              }}
            >
              WIDGETS
            </span>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 8,
                color: 'var(--muted2)',
                letterSpacing: '0.06em',
                display: 'block',
                marginTop: 2,
              }}
            >
              Drag onto canvas or click to add
            </span>
          </div>
          <button
            onClick={handleRequestClose}
            className="interactive-button"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted2)',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
              padding: '0 2px',
              transition: 'color 0.1s',
            }}
            aria-label="Close widget picker"
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 14px 6px', flexShrink: 0 }}>
          <input
            type="text"
            placeholder="Search widgets..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '6px 10px',
              background: 'var(--bg4)',
              border: '0.5px solid var(--border)',
              borderRadius: 3,
              fontFamily: 'var(--mono)',
              fontSize: 9,
              letterSpacing: '0.08em',
              color: 'var(--white)',
              outline: 'none',
            }}
          />
        </div>

        {/* Widget grid */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 18px 16px 14px' }}>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: '24px 0',
                fontFamily: 'var(--mono)',
                fontSize: 9,
                color: 'var(--muted2)',
                letterSpacing: '0.08em',
                textAlign: 'center',
              }}
            >
              No widgets match "{query}"
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {groupedWidgets.map((group, groupIndex) => (
                <section
                  key={group.category}
                  className="reveal-grow"
                  style={{ overflow: 'hidden' }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 8,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: CATEGORY_COLORS[group.category],
                      marginBottom: 8,
                      paddingBottom: 4,
                      borderBottom: `0.5px solid ${CATEGORY_COLORS[group.category]}`,
                    }}
                  >
                    {group.category}
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: 10,
                      justifyItems: 'stretch',
                    }}
                  >
                    {group.widgets.map((widget, index) => (
                      <WidgetCard
                        key={widget.type}
                        widget={widget}
                        onAdd={onAdd}
                        onClose={handleRequestClose}
                        index={groupIndex * 10 + index}
                        registerRef={registerCardRef}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
