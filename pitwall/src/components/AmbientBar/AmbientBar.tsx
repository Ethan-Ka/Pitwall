import { useAmbientStore } from '../../store/ambientStore'
import { FLAG_COLORS, getFlagLabel, getTransitionDuration } from './flagStateMachine'
import { ToastQueue } from './ToastQueue'

// Inject keyframe animations once
const STYLE_ID = 'ambient-bar-keyframes'
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @keyframes ambientPulse1hz {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.55; }
    }
    @keyframes ambientPulse05hz {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.65; }
    }
    @keyframes glowLinePulse {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; }
    }
  `
  document.head.appendChild(style)
}

// Blend two hex colors toward a tint at a given ratio
function blendHex(base: string, tint: string, ratio: number): string {
  const parse = (hex: string) => {
    const h = hex.replace('#', '')
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ]
  }
  try {
    const [r1, g1, b1] = parse(base)
    const [r2, g2, b2] = parse(tint)
    const r = Math.round(r1 + (r2 - r1) * ratio)
    const g = Math.round(g1 + (g2 - g1) * ratio)
    const b = Math.round(b1 + (b2 - b1) * ratio)
    return `rgb(${r},${g},${b})`
  } catch {
    return base
  }
}

export function AmbientBar() {
  const flagState = useAmbientStore((s) => s.flagState)
  const leaderColorMode = useAmbientStore((s) => s.leaderColorMode)
  const leaderColor = useAmbientStore((s) => s.leaderColor)
  const toasts = useAmbientStore((s) => s.toasts)

  const colors = FLAG_COLORS[flagState]
  const label = getFlagLabel(flagState)
  const duration = getTransitionDuration(flagState)

  // Compute background — possibly tinted by leader color in GREEN mode
  let bgColor = colors.background
  if (flagState === 'GREEN' && leaderColorMode && leaderColor) {
    bgColor = blendHex(colors.background, leaderColor, 0.18)
  }

  // Pulse animation
  let pulseAnimation: string | undefined
  if (colors.pulse) {
    if (colors.pulseHz === 1) {
      pulseAnimation = 'ambientPulse1hz 1s ease-in-out infinite'
    } else if (colors.pulseHz === 0.5) {
      pulseAnimation = 'ambientPulse05hz 2s ease-in-out infinite'
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        height: 50,
        width: '100%',
        background: bgColor,
        transition: `background ${duration} ease`,
        display: 'flex',
        alignItems: 'center',
        paddingInline: 16,
        gap: 12,
        flexShrink: 0,
        animation: pulseAnimation,
      }}
    >
      {/* Flag swatch */}
      <div style={{
        width: 24,
        height: 16,
        borderRadius: 2,
        background: colors.flagColor === 'transparent' ? 'var(--border2)' : colors.flagColor,
        flexShrink: 0,
        boxShadow: colors.flagColor !== 'transparent' ? `0 0 8px ${colors.glow}66` : undefined,
        transition: `background ${duration} ease`,
      }} />

      {/* Flag state label */}
      <span style={{
        flex: 1,
        fontFamily: 'var(--mono)',
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: colors.text,
        transition: `color ${duration} ease`,
      }}>
        {label}
      </span>

      {/* Toast queue on the right */}
      <div style={{ flexShrink: 0 }}>
        <ToastQueue toasts={toasts} />
      </div>

      {/* Bottom glow line */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 1,
        background: colors.flagColor === 'transparent'
          ? 'var(--border)'
          : `linear-gradient(90deg, transparent 0%, ${colors.glow}88 30%, ${colors.glow} 50%, ${colors.glow}88 70%, transparent 100%)`,
        transition: `background ${duration} ease`,
        animation: colors.pulse ? 'glowLinePulse 1s ease-in-out infinite' : undefined,
      }} />
    </div>
  )
}
