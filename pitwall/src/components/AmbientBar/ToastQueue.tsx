import { useEffect, useRef, useState } from 'react'
import type { ToastItem } from '../../store/ambientStore'
import { FLAG_COLORS } from './flagStateMachine'

interface ToastQueueProps {
  toasts: ToastItem[]
}

// Per-toast lifecycle manager
function Toast({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter')
  const colors = FLAG_COLORS[item.flagState]

  // Capture onDone in a ref so the timers are only set once on mount.
  // Without this, a new onDone identity on every parent re-render (e.g. when a
  // new toast is appended to the toasts array) would cancel and restart the
  // timers, permanently preventing toasts from being dismissed.
  const onDoneRef = useRef(onDone)
  useEffect(() => { onDoneRef.current = onDone })

  useEffect(() => {
    // enter: 300ms slide up
    const t1 = setTimeout(() => setPhase('hold'), 300)
    // hold: 2000ms
    const t2 = setTimeout(() => setPhase('exit'), 2300)
    // exit: 600ms fade out then remove
    const t3 = setTimeout(() => onDoneRef.current(), 2900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, []) // intentionally empty — timers must run exactly once per mount

  const translateY = phase === 'enter' ? '12px' : '0px'
  const opacity = phase === 'exit' ? 0 : phase === 'enter' ? 0.6 : 1

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 12px',
        borderRadius: 20,
        background: `${colors.background}ee`,
        border: `0.5px solid ${colors.flagColor}55`,
        boxShadow: `0 0 12px ${colors.glow}33, 0 2px 8px rgba(0,0,0,0.5)`,
        transform: `translateY(${translateY})`,
        opacity,
        transition: `transform 0.3s ease-out, opacity ${phase === 'exit' ? '0.6s' : '0.25s'} ease`,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}
    >
      {/* color dot */}
      <div style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: colors.flagColor,
        flexShrink: 0,
        boxShadow: `0 0 6px ${colors.glow}`,
      }} />
      <span style={{
        fontFamily: 'var(--mono)',
        fontSize: 9,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: colors.text,
        maxWidth: 280,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {item.message}
      </span>
    </div>
  )
}

export function ToastQueue({ toasts }: ToastQueueProps) {
  const [visible, setVisible] = useState<ToastItem[]>([])

  useEffect(() => {
    setVisible((prev) => {
      const prevIds = new Set(prev.map((t) => t.id))
      const newItems = toasts.filter((t) => !prevIds.has(t.id))
      if (newItems.length === 0) return prev
      return [...prev, ...newItems]
    })
  }, [toasts])

  function removeToast(id: string) {
    setVisible((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 4,
      pointerEvents: 'none',
    }}>
      {visible.map((item) => (
        <Toast key={item.id} item={item} onDone={() => removeToast(item.id)} />
      ))}
    </div>
  )
}
