import type { FastF1CircuitMap } from '../api/fastf1Bridge'

const PREFIX = 'f1-circuitmap-'

export function saveCircuitMap(year: number, round: number, data: FastF1CircuitMap): void {
  try {
    localStorage.setItem(`${PREFIX}${year}-${round}`, JSON.stringify(data))
  } catch {
    // Ignore storage errors (quota exceeded, private browsing, etc.)
  }
}

export function loadCircuitMap(year: number, round: number): FastF1CircuitMap | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${year}-${round}`)
    if (!raw) return null
    return JSON.parse(raw) as FastF1CircuitMap
  } catch {
    return null
  }
}

export function hasCachedCircuitMap(year: number, round: number): boolean {
  try {
    return localStorage.getItem(`${PREFIX}${year}-${round}`) !== null
  } catch {
    return false
  }
}
