const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  openNewWindow: () => ipcRenderer.invoke('open-new-window'),
  openDevControlWindow: () => ipcRenderer.invoke('open-dev-control-window'),
  onDebugAction: (cb) => {
    const handler = (_event, data) => cb(data)
    ipcRenderer.on('debug-action', handler)
    return () => ipcRenderer.removeListener('debug-action', handler)
  },
  onFocusChange: (cb) => {
    const handler = (_event, focused) => cb(focused)
    ipcRenderer.on('window-focus-change', handler)
    return () => ipcRenderer.removeListener('window-focus-change', handler)
  },
})
