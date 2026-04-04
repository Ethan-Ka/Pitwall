// Resolves a widget's DriverContext to a concrete driver number
import { useDriverStore } from '../store/driverStore'
import { usePositions } from './usePositions'
import type { DriverContext } from '../store/workspaceStore'

export interface WidgetDriverResult {
  driverNumber: number | null
  badge: 'FOCUS' | 'POSITION' | 'PINNED' | null
  badgeLabel: string
  borderColor: string
}

export function useWidgetDriver(context: DriverContext): WidgetDriverResult {
  const canvasFocus = useDriverStore((s) => s.canvasFocus)
  const { data: positions } = usePositions()

  if (context === 'FOCUS') {
    return {
      driverNumber: canvasFocus,
      badge: 'FOCUS',
      badgeLabel: 'FOCUS',
      borderColor: 'rgba(29,184,106,0.5)',
    }
  }

  if (context.startsWith('PINNED:')) {
    const num = parseInt(context.slice(7), 10)
    return {
      driverNumber: num,
      badge: 'PINNED',
      badgeLabel: 'PINNED',
      borderColor: 'rgba(155,89,245,0.5)',
    }
  }

  // Position-based
  if (!positions) {
    return { driverNumber: null, badge: 'POSITION', badgeLabel: context, borderColor: 'rgba(201,168,76,0.5)' }
  }

  let driverNumber: number | null = null

  if (context === 'P1') driverNumber = positions.find((p) => p.position === 1)?.driver_number ?? null
  else if (context === 'P2') driverNumber = positions.find((p) => p.position === 2)?.driver_number ?? null
  else if (context === 'P3') driverNumber = positions.find((p) => p.position === 3)?.driver_number ?? null
  else if (context === 'P4') driverNumber = positions.find((p) => p.position === 4)?.driver_number ?? null
  else if (context === 'P5') driverNumber = positions.find((p) => p.position === 5)?.driver_number ?? null
  else if (context === 'GAP+1') {
    const focusPos = positions.find((p) => p.driver_number === canvasFocus)?.position
    if (focusPos && focusPos > 1) {
      driverNumber = positions.find((p) => p.position === focusPos - 1)?.driver_number ?? null
    }
  } else if (context === 'GAP-1') {
    const focusPos = positions.find((p) => p.driver_number === canvasFocus)?.position
    if (focusPos) {
      driverNumber = positions.find((p) => p.position === focusPos + 1)?.driver_number ?? null
    }
  }

  return {
    driverNumber,
    badge: 'POSITION',
    badgeLabel: context,
    borderColor: 'rgba(201,168,76,0.5)',
  }
}
