import type { FlagState } from '../../store/ambientStore'

// Priority: lower number = higher priority
export const FLAG_PRIORITY: Record<FlagState, number> = {
  RED: 1,
  SAFETY_CAR: 2,
  VIRTUAL_SC: 3,
  YELLOW: 4,
  FASTEST_LAP: 5,
  CHECKERED: 6,
  GREEN: 7,
  CALM: 8,
  NONE: 9,
}

export interface FlagColors {
  background: string
  glow: string
  text: string
  flagColor: string
  pulse: boolean
  pulseHz: number
}

export const FLAG_COLORS: Record<FlagState, FlagColors> = {
  RED: {
    background: '#1a0404',
    glow: '#FF1E1E',
    text: '#FF6060',
    flagColor: '#FF1E1E',
    pulse: true,
    pulseHz: 1,
  },
  SAFETY_CAR: {
    background: '#110d00',
    glow: '#FFA500',
    text: '#FFB830',
    flagColor: '#FFA500',
    pulse: true,
    pulseHz: 0.5,
  },
  VIRTUAL_SC: {
    background: '#100a00',
    glow: '#E09000',
    text: '#E09000',
    flagColor: '#E09000',
    pulse: false,
    pulseHz: 0,
  },
  YELLOW: {
    background: '#1a1500',
    glow: '#FFD600',
    text: '#FFE566',
    flagColor: '#FFD600',
    pulse: false,
    pulseHz: 0,
  },
  FASTEST_LAP: {
    background: '#100b1a',
    glow: '#9B59F5',
    text: '#C89BFF',
    flagColor: '#9B59F5',
    pulse: false,
    pulseHz: 0,
  },
  CHECKERED: {
    background: '#111110',
    glow: '#F0EEE8',
    text: '#F0EEE8',
    flagColor: '#F0EEE8',
    pulse: false,
    pulseHz: 0,
  },
  GREEN: {
    background: '#0a1a0e',
    glow: '#00C850',
    text: '#4EFF8A',
    flagColor: '#00C850',
    pulse: false,
    pulseHz: 0,
  },
  CALM: {
    background: '#101010',
    glow: '#EDE8DC',
    text: '#EDE8DC',
    flagColor: '#EDE8DC',
    pulse: false,
    pulseHz: 0,
  },
  NONE: {
    background: 'var(--bg2)',
    glow: 'transparent',
    text: 'var(--muted)',
    flagColor: 'transparent',
    pulse: false,
    pulseHz: 0,
  },
}

export function getFlagLabel(state: FlagState): string {
  switch (state) {
    case 'RED': return 'Red flag — race suspended'
    case 'SAFETY_CAR': return 'Safety car deployed'
    case 'VIRTUAL_SC': return 'Virtual safety car'
    case 'YELLOW': return 'Yellow flag'
    case 'FASTEST_LAP': return 'Fastest lap'
    case 'CHECKERED': return 'Chequered flag'
    case 'GREEN': return 'Green flag — racing'
    case 'CALM': return 'Calm mode'
    case 'NONE': return '—'
  }
}

export function getTransitionDuration(state: FlagState): string {
  switch (state) {
    case 'RED': return '0.3s'
    case 'SAFETY_CAR': return '0.6s'
    case 'VIRTUAL_SC': return '0.8s'
    case 'YELLOW': return '0.8s'
    case 'FASTEST_LAP': return '0.3s'
    case 'CHECKERED': return '1.0s'
    case 'GREEN': return '1.2s'
    case 'CALM': return '2.0s'
    default: return '1.2s'
  }
}
