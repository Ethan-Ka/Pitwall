import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OpenF1Driver } from '../api/openf1'

interface DriverStore {
  drivers: OpenF1Driver[]
  starred: number[]           // driver_numbers
  canvasFocus: number | null  // driver_number of canvas focus driver
  teamColors: Record<number, string> // driver_number → hex color
  setDrivers: (drivers: OpenF1Driver[]) => void
  toggleStar: (driverNumber: number) => void
  setCanvasFocus: (driverNumber: number | null) => void
  getDriver: (driverNumber: number) => OpenF1Driver | undefined
  getTeamColor: (driverNumber: number) => string
}

export const useDriverStore = create<DriverStore>()(
  persist(
    (set, get) => ({
      drivers: [],
      starred: [],
      canvasFocus: null,
      teamColors: {},

      setDrivers: (drivers) => {
        const teamColors: Record<number, string> = {}
        for (const d of drivers) {
          teamColors[d.driver_number] = `#${d.team_colour}`
        }
        set({ drivers, teamColors })
      },

      toggleStar: (driverNumber) => {
        const { starred } = get()
        if (starred.includes(driverNumber)) {
          set({ starred: starred.filter((n) => n !== driverNumber) })
        } else {
          set({ starred: [...starred, driverNumber] })
        }
      },

      setCanvasFocus: (driverNumber) => set({ canvasFocus: driverNumber }),

      getDriver: (driverNumber) => get().drivers.find((d) => d.driver_number === driverNumber),

      getTeamColor: (driverNumber) => {
        const color = get().teamColors[driverNumber]
        return color ?? '#6B6B70'
      },
    }),
    {
      name: 'pitwall-drivers',
      partialize: (s) => ({ starred: s.starred }),
    }
  )
)
