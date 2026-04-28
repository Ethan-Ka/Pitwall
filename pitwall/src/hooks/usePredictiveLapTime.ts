import { useEffect, useRef, useState } from 'react'

/**
 * Smoothly advances a polled timing value between API updates.
 *
 * When a new `polledValue` arrives, the display snaps to it immediately and
 * resumes counting from that point. If the next poll arrives with a corrected
 * value, it snaps again. Use this whenever you have a running timer coming from
 * periodic API responses (e.g. current lap time sampled at each poll) and want
 * the display to appear live rather than frozen between polls.
 *
 * Not intended for start-time-anchored timers — if you know when T0 was, compute
 * `(now - startMs) / 1000` directly; that has no drift.
 */
export function usePredictiveLapTime(
  polledValue: number | null,
  options?: { tickMs?: number; enabled?: boolean }
): number | null {
  const enabled = options?.enabled ?? true
  const tickMs = options?.tickMs ?? 100

  const anchorValue = useRef<number | null>(null)
  const anchorTime = useRef<number>(0)
  const [display, setDisplay] = useState<number | null>(polledValue)

  // Snap to the new polled value and record when it arrived
  useEffect(() => {
    anchorValue.current = polledValue
    anchorTime.current = Date.now()
    setDisplay(polledValue)
  }, [polledValue])

  // Advance the display value between polls
  useEffect(() => {
    if (!enabled || polledValue == null) return
    const id = setInterval(() => {
      const anchor = anchorValue.current
      if (anchor == null) return
      setDisplay(anchor + (Date.now() - anchorTime.current) / 1000)
    }, tickMs)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tickMs, polledValue != null])

  return enabled ? display : polledValue
}
