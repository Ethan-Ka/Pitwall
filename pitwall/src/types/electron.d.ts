interface ElectronAPI {
  platform: string
  openNewWindow: () => Promise<void>
  openDevControlWindow: () => Promise<void>
  onDebugAction: (cb: (message: { action: string; payload?: unknown }) => void) => () => void
  onFocusChange: (cb: (focused: boolean) => void) => () => void
}

interface DevToolsAPI {
  triggerAction: (action: string, payload?: unknown) => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
    devToolsAPI?: DevToolsAPI
  }
}

export {}
