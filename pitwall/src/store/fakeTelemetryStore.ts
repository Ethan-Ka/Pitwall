import { create } from 'zustand'
import type { OpenF1CarData } from '../api/openf1'

// Static fake telemetry — a car on a DRS straight, full throttle, 7th gear
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
}))
