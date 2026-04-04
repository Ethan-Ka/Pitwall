import { create } from 'zustand'

export type LogLevel = 'ERR' | 'WARN' | 'INFO' | 'DBG'

export interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  message: string
  source: string
}

interface LogStore {
  entries: LogEntry[]
  addEntry: (level: LogLevel, message: string, source?: string) => void
  clear: () => void
}

export const useLogStore = create<LogStore>()((set) => ({
  entries: [],
  addEntry: (level, message, source = '') => {
    const now = new Date()
    const timestamp = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}.${String(now.getMilliseconds()).padStart(3,'0')}`
    const entry: LogEntry = { id: crypto.randomUUID(), timestamp, level, message, source }
    set((s) => ({
      entries: [...s.entries.slice(-999), entry], // keep last 1000
    }))
  },
  clear: () => set({ entries: [] }),
}))

// Global console bridge — captures errors to the log
export function initLogBridge() {
  const orig = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    orig(...args)
    const message = args.map((a) => (a instanceof Error ? a.message : String(a))).join(' ')
    useLogStore.getState().addEntry('ERR', message, 'console')
  }
}
