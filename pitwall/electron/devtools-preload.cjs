const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('devToolsAPI', {
  triggerAction: (action, payload) => ipcRenderer.send('debug-trigger-action', { action, payload }),
})
