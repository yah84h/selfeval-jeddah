// التحقق من التحديثات وتنزيلها وتثبيتها عبر GitHub Releases (electron-updater)
// المبدأ: التحديث يستبدل ملفات البرنامج فقط؛ مجلد البيانات خارج مجلد التثبيت ولا يُمَس.
// قبل التثبيت تؤخذ نسخة احتياطية "pre-update" تلقائيًا كشبكة أمان إضافية.
import { app, type BrowserWindow } from 'electron'
import electronUpdater from 'electron-updater'
import type { UpdateStatus } from '@shared/types'
import { EVENTS } from '@shared/ipc'

const { autoUpdater } = electronUpdater

export type UpdaterDeps = {
  getWindow: () => BrowserWindow | null
  beforeInstall: () => void | Promise<void>
  onChecked: () => void
}

export function createUpdaterService(deps: UpdaterDeps) {
  let status: UpdateStatus = app.isPackaged ? { state: 'idle' } : { state: 'dev' }

  const emit = (next: UpdateStatus): void => {
    status = next
    deps.getWindow()?.webContents.send(EVENTS.updateStatus, next)
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowDowngrade = false
  autoUpdater.logger = null

  autoUpdater.on('checking-for-update', () => emit({ state: 'checking' }))
  autoUpdater.on('update-not-available', () => { deps.onChecked(); emit({ state: 'not-available', currentVersion: app.getVersion() }) })
  autoUpdater.on('update-available', info => {
    deps.onChecked()
    const notes = typeof info.releaseNotes === 'string'
      ? info.releaseNotes
      : Array.isArray(info.releaseNotes) ? info.releaseNotes.map(n => n.note ?? '').join('\n') : ''
    emit({ state: 'available', version: info.version, releaseNotes: notes, releaseDate: info.releaseDate ?? '' })
  })
  autoUpdater.on('download-progress', p => emit({ state: 'downloading', percent: Math.round(p.percent), transferred: p.transferred, total: p.total, bytesPerSecond: p.bytesPerSecond }))
  autoUpdater.on('update-downloaded', info => emit({ state: 'downloaded', version: info.version }))
  autoUpdater.on('error', error => emit({ state: 'error', message: humanize(error) }))

  return {
    status: (): UpdateStatus => status,
    async check(): Promise<UpdateStatus> {
      if (!app.isPackaged) { emit({ state: 'dev' }); return status }
      try {
        const result = await autoUpdater.checkForUpdates()
        if (!result) emit({ state: 'error', message: 'التحديث التلقائي غير متاح لهذا النوع من التثبيت.' })
      } catch (error) { emit({ state: 'error', message: humanize(error as Error) }) }
      return status
    },
    async download(): Promise<void> {
      if (!app.isPackaged) return
      try { await autoUpdater.downloadUpdate() } catch (error) { emit({ state: 'error', message: humanize(error as Error) }) }
    },
    async install(): Promise<void> {
      if (!app.isPackaged || status.state !== 'downloaded') return
      await deps.beforeInstall()
      setImmediate(() => autoUpdater.quitAndInstall(false, true))
    }
  }
}

function humanize(error: Error): string {
  const msg = error?.message ?? String(error)
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|net::ERR|getaddrinfo/i.test(msg)) return 'تعذر الاتصال بخادم التحديثات. تأكد من اتصال الإنترنت ثم أعد المحاولة.'
  if (/404/.test(msg)) return 'لا توجد إصدارات منشورة بعد على خادم التحديثات.'
  if (/sha512|checksum/i.test(msg)) return 'ملف التحديث تالف أو غير مطابق. أعد المحاولة لاحقًا.'
  return msg
}

export type UpdaterService = ReturnType<typeof createUpdaterService>
