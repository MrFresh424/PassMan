// main.js (Electron entry, ESM)
import { app, BrowserWindow, shell, ipcMain, Menu } from 'electron'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const isDev = !app.isPackaged

// Give Windows a stable AppID (shortcuts/notifications look nicer)
app.setAppUserModelId('com.yourco.passman')

// --- Vault File Handling ---
const VAULT_FILE_NAME = 'vault.bin'
let vaultPath // set on first access

const getVaultPath = () => {
  if (!vaultPath) {
    const userDataPath = app.getPath('userData')
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true })
    }
    vaultPath = join(userDataPath, VAULT_FILE_NAME)
  }
  return vaultPath
}

// --- IPC Handlers ---
const setupIpcHandlers = () => {
  ipcMain.handle('vault:exists', () => {
    return fs.existsSync(getVaultPath())
  })

  ipcMain.handle('vault:read', () => {
    try {
      const vaultData = fs.readFileSync(getVaultPath())
      return { ok: true, data: Array.from(vaultData) }
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { ok: true, data: null }
      }
      console.error('Failed to read vault:', error)
      return { ok: false, error: 'Failed to read vault file.' }
    }
  })

  ipcMain.handle('vault:write', (_, data) => {
    try {
      fs.writeFileSync(getVaultPath(), Buffer.from(data))
      return { ok: true }
    } catch (error) {
      console.error('Failed to write vault:', error)
      return { ok: false, error: 'Failed to save vault file.' }
    }
  })
}

function createWindow () {
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    backgroundColor: '#0a0f1f',
    autoHideMenuBar: !isDev,              // hide menu bar in production (Alt shows it)
    // If you want ZERO menu even on Alt, uncomment next line:
    // menuBarVisible: isDev,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(__dirname, 'preload.js'),
      devTools: isDev,                    // disable DevTools in production
      disableBlinkFeatures: 'Autofill',   // silence autofill warning
    },
  })

  if (isDev) {
    const url = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173/'
    win.loadURL(url)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    // Don’t allow opening DevTools via shortcuts in prod
    win.webContents.on('before-input-event', (event, input) => {
      if ((input.control || input.meta) && input.key?.toLowerCase() === 'i') {
        event.preventDefault()
      }
    })
    win.loadFile(join(__dirname, 'dist', 'index.html'))
  }

  // Only allow safe external links
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(() => {
    getVaultPath()
    setupIpcHandlers()
    // Optional: remove application menu entirely in production
    if (!isDev) Menu.setApplicationMenu(null)
    createWindow()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}
