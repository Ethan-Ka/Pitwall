interface ElectronAPI {
  platform: string
  openNewWindow: () => Promise<void>
  onFocusChange: (cb: (focused: boolean) => void) => () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
