// العملية الرئيسية: النافذة، الأمان، بروتوكول المعاينة، التشغيل والصيانة
import { app, BrowserWindow, dialog, Menu, protocol, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { createContainer, type Container } from './services/container'
import { createUpdaterService } from './services/updaterService'
import { registerIpc } from './ipc/handlers'

// اسم ثابت لمجلد userData حتى لا يتغير بتغيير اسم المنتج المعروض
app.setName('selfeval-jeddah')

// بروتوكول آمن لمعاينة ملفات الشواهد داخل التطبيق (PDF/صور) دون كشف نظام الملفات
protocol.registerSchemesAsPrivileged([
  { scheme: 'evidence', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: false } }
])

let mainWindow: BrowserWindow | null = null
let container: Container | null = null

const wasmCandidates = (): string[] => [
  path.join(process.resourcesPath ?? '', 'sql-wasm.wasm'),
  path.join(app.getAppPath(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
]

async function boot(): Promise<Container> {
  const userData = app.getPath('userData')
  return createContainer({
    settingsFile: path.join(userData, 'settings.json'),
    defaultDataDir: path.join(userData, 'data'),
    appVersion: app.getVersion(),
    wasmCandidates: wasmCandidates()
  })
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    title: 'دليل التقويم المدرسي',
    backgroundColor: '#fcfbff',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false
    }
  })
  win.once('ready-to-show', () => win.show())
  // أي رابط خارجي يُفتح في متصفح النظام لا داخل التطبيق
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' } })
  win.webContents.on('will-navigate', (event, url) => { if (!url.startsWith(process.env.ELECTRON_RENDERER_URL ?? 'file:')) event.preventDefault() })

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
  win.on('closed', () => { mainWindow = null })
  return win
}

function registerPreviewProtocol(getContainer: () => Container | null): void {
  protocol.handle('evidence', request => {
    const url = new URL(request.url)
    const [, id] = url.pathname.split('/') // /<id>/<name>
    const c = getContainer()
    const evidence = c?.evidence.get(Number(id))
    if (!c || !evidence) return new Response('Not found', { status: 404 })
    const abs = c.evidence.absolutePath(evidence)
    if (!fs.existsSync(abs)) return new Response('Missing', { status: 404 })
    const stream = Readable.toWeb(fs.createReadStream(abs)) as ReadableStream
    return new Response(stream, {
      headers: {
        'Content-Type': evidence.mimeType,
        'Content-Length': String(fs.statSync(abs).size),
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(evidence.fileName)}`,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      }
    })
  })
}

app.whenReady().then(async () => {
  try {
    container = await boot()
  } catch (error) {
    dialog.showErrorBox('تعذر فتح بيانات المدرسة', (error as Error).message)
    app.quit()
    return
  }

  registerPreviewProtocol(() => container)
  Menu.setApplicationMenu(null)

  const updater = createUpdaterService({
    getWindow: () => mainWindow,
    beforeInstall: () => { container?.backup.create('pre-update') },
    onChecked: () => { container?.settings.update({ lastUpdateCheckAt: new Date().toISOString() }) }
  })

  registerIpc({ container, updater, getWindow: () => mainWindow })
  mainWindow = createWindow()

  // صيانة عند التشغيل: نسخة تلقائية يومية + تفريغ السلة القديمة (بعد ظهور النافذة)
  mainWindow.once('show', () => {
    setTimeout(() => { try { container?.maintenance() } catch (error) { console.error('[maintenance]', error) } }, 1500)
    // فحص هادئ للتحديثات بعد 10 ثوانٍ (بلا تنزيل تلقائي)
    setTimeout(() => { void updater.check() }, 10_000)
  })

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('before-quit', () => { try { container?.close() } catch { /* ignore */ } })
