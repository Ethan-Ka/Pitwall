const { app, BrowserWindow, shell, ipcMain } = require('electron')
const path = require('path')

const isDev = process.env.VITE_DEV_SERVER_URL != null

function createWindow(options = {}) {
  const win = new BrowserWindow({
    width: options.width ?? 1440,
    height: options.height ?? 900,
    x: options.x,
    y: options.y,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0B0B0C',
    show: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  })

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    // Only open DevTools on the first window
    if (BrowserWindow.getAllWindows().length === 0) {
      win.webContents.openDevTools()
    }
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  win.once('ready-to-show', () => win.show())

  // Open external links in browser, not Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  return win
}

app.whenReady().then(() => {
  // IPC handler: open a new window offset from the requesting window
  ipcMain.handle('open-new-window', (_event) => {
    const sender = BrowserWindow.fromWebContents(_event.sender)
    const [x, y] = sender ? sender.getPosition() : [100, 100]
    createWindow({ x: x + 30, y: y + 30 })
  })

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
