const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  openNewWindow: () => ipcRenderer.invoke('open-new-window'),
  onFocusChange: (cb) => {
    const handler = (_event, focused) => cb(focused)
    ipcRenderer.on('window-focus-change', handler)
    return () => ipcRenderer.removeListener('window-focus-change', handler)
  },
})
