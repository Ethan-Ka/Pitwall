const { app, BrowserWindow, shell, ipcMain, Menu } = require('electron')
const path = require('path')

const isDev = process.env.VITE_DEV_SERVER_URL != null
const mainWindows = new Set()
let devControlWindow = null

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

  mainWindows.add(win)
  win.on('closed', () => {
    mainWindows.delete(win)
  })

  // Open external links in browser, not Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  return win
}

function createDevControlWindow() {
  if (devControlWindow && !devControlWindow.isDestroyed()) {
    devControlWindow.focus()
    return devControlWindow
  }

  devControlWindow = new BrowserWindow({
    width: 420,
    height: 520,
    minWidth: 360,
    minHeight: 420,
    resizable: true,
    title: 'Developer Menu',
    backgroundColor: '#111216',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'devtools-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  })

  devControlWindow.loadFile(path.join(__dirname, 'devtools.html'))

  devControlWindow.on('closed', () => {
    devControlWindow = null
  })

  return devControlWindow
}

function buildAppMenu() {
  const template = [
    ...(process.platform === 'darwin'
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' }],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(process.platform === 'darwin'
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
              { type: 'separator' },
              {
                label: 'Speech',
                submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }],
              },
            ]
          : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Open Developer Menu',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => createDevControlWindow(),
        },
        { type: 'separator' },
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin' ? [{ type: 'separator' }, { role: 'front' }] : [{ role: 'close' }]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://www.electronjs.org')
          },
        },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function broadcastDebugAction(action, payload) {
  for (const win of mainWindows) {
    if (!win.isDestroyed()) {
      win.webContents.send('debug-action', { action, payload })
    }
  }
}

app.whenReady().then(() => {
  buildAppMenu()

  // IPC handler: open a new window offset from the requesting window
  ipcMain.handle('open-new-window', (_event) => {
    const sender = BrowserWindow.fromWebContents(_event.sender)
    const [x, y] = sender ? sender.getPosition() : [100, 100]
    createWindow({ x: x + 30, y: y + 30 })
  })

  ipcMain.handle('open-dev-control-window', () => {
    createDevControlWindow()
  })

  ipcMain.on('debug-trigger-action', (_event, data) => {
    if (!data || typeof data.action !== 'string') return
    broadcastDebugAction(data.action, data.payload)
  })

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
