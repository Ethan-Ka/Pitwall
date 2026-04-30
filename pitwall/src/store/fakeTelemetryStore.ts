import { create } from 'zustand'
import type { OpenF1CarData } from '../api/openf1'
import type { DriverXY } from '../hooks/useLocation'

const FAKE_BASE: Omit<OpenF1CarData, 'driver_number' | 'date' | 'session_key'> = {
  speed: 318,
  throttle: 99,
  brake: 0,
  rpm: 14200,
  n_gear: 7,
  drs: 14,
}

interface FakeTelemetryStore {
  enabled: boolean
  enable: () => void
  disable: () => void
  toggle: () => void
  buildSample: (driverNumber: number) => OpenF1CarData
  buildLocationSamples: (driverNumbers: number[], trackX?: number[], trackY?: number[]) => DriverXY[]
  buildTrackPoints: (trackX?: number[], trackY?: number[]) => { x: number; y: number }[]
}

export const useFakeTelemetryStore = create<FakeTelemetryStore>()((set) => ({
  enabled: false,
  enable: () => set({ enabled: true }),
  disable: () => set({ enabled: false }),
  toggle: () => set((s) => ({ enabled: !s.enabled })),
  buildSample: (driverNumber: number): OpenF1CarData => ({
    ...FAKE_BASE,
    driver_number: driverNumber,
    session_key: 9999,
    date: new Date().toISOString(),
  }),
  buildLocationSamples: (driverNumbers, trackX, trackY): DriverXY[] => {
    if (!trackX || !trackY || trackX.length < 2) return []

    const n = driverNumbers.length
    const t = Date.now() / 1000
    const lapFraction = (t % 90) / 90
    const baseOffset = lapFraction  // 0..1 through one lap
    const ptCount = trackX.length

    return driverNumbers.map((driverNumber, i) => {
      const frac = (baseOffset + i / n) % 1
      const rawIdx = frac * ptCount
      const idxA = Math.floor(rawIdx) % ptCount
      const idxB = (idxA + 1) % ptCount
      const t2 = rawIdx - Math.floor(rawIdx)
      const x = trackX[idxA] + (trackX[idxB] - trackX[idxA]) * t2
      const y = trackY[idxA] + (trackY[idxB] - trackY[idxA]) * t2
      return { driverNumber, x, y, date: new Date().toISOString() }
    })
  },
  buildTrackPoints: (trackX, trackY): { x: number; y: number }[] => {
    if (trackX && trackY && trackX.length > 1) {
      return trackX.map((x, i) => ({ x, y: trackY[i] }))
    }
    return Array.from({ length: 360 }, (_, i) => {
      const a = (i / 360) * 2 * Math.PI
      return { x: Math.cos(a) * 500, y: Math.sin(a) * 300 }
    })
  },
}))
