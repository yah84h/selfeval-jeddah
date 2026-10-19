// معالجات IPC: كل قناة تتحقق من مدخلاتها بـ zod قبل تنفيذ أي شيء
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { z, type ZodType } from 'zod'
import { schemas, EVENTS, ALLOWED_EXTENSIONS, type SchemaKey } from '@shared/ipc'
import type { AppInfo } from '@shared/types'
import type { Container } from '../services/container'
import type { UpdaterService } from '../services/updaterService'

type Deps = {
  container: Container
  updater: UpdaterService
  getWindow: () => BrowserWindow | null
}

export function registerIpc({ container: c, updater, getWindow }: Deps): void {
  const notify = (): void => { getWindow()?.webContents.send(EVENTS.dataChanged) }
  const openDialog = (options: Electron.OpenDialogOptions) => { const w = getWindow(); return w ? dialog.showOpenDialog(w, options) : dialog.showOpenDialog(options) }
  const saveDialog = (options: Electron.SaveDialogOptions) => { const w = getWindow(); return w ? dialog.showSaveDialog(w, options) : dialog.showSaveDialog(options) }

  const handle = <K extends SchemaKey>(channel: K, fn: (input: z.output<(typeof schemas)[K]>) => unknown): void => {
    ipcMain.handle(channel, async (_event, raw: unknown) => {
      const parsed = (schemas[channel] as ZodType).safeParse(raw ?? {})
      if (!parsed.success) throw new Error(`مدخلات غير صالحة لـ ${channel}: ${parsed.error.issues.map(i => i.message).join('، ')}`)
      return fn(parsed.data as z.output<(typeof schemas)[K]>)
    })
  }
  const plain = (channel: string, fn: (arg: never) => unknown): void => {
    ipcMain.handle(channel, async (_event, arg: unknown) => fn(arg as never))
  }

  // ----- التطبيق
  plain('app.info', (): AppInfo => ({
    version: app.getVersion(),
    platform: process.platform,
    isPackaged: app.isPackaged,
    dataDir: c.paths.dataDir,
    userDataDir: app.getPath('userData'),
    schemaVersion: c.schemaVersion
  }))
  plain('app.openDataDir', () => shell.openPath(c.paths.dataDir))
  plain('app.openBackupsDir', () => { fs.mkdirSync(c.paths.backupsDir, { recursive: true }); return shell.openPath(c.paths.backupsDir) })
  plain('app.openExternal', (url: string) => { if (/^https:\/\//.test(url)) return shell.openExternal(url) })

  // ----- المدرسة
  plain('school.get', () => c.school.get())
  handle('school.save', input => { const s = c.school.save(input); c.activity.log('school.save', input.name); notify(); return s })

  // ----- الإنجاز
  plain('progress.get', () => c.progress.get())

  // ----- الشواهد
  handle('evidence.pick', async input => {
    const result = await openDialog({
      title: `رفع شاهد: ${input.witnessName}`,
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'كل الملفات المدعومة', extensions: [...ALLOWED_EXTENSIONS] },
        { name: 'PDF', extensions: ['pdf'] },
        { name: 'Office', extensions: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'] },
        { name: 'صور', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const r = c.evidence.addFromPaths(input.indicatorCode, input.witnessName, result.filePaths)
    c.activity.log('evidence.add', `${input.indicatorCode} / ${input.witnessName}: ${r.added.length} ملف`)
    notify()
    return r
  })
  handle('evidence.addFromPaths', input => {
    const r = c.evidence.addFromPaths(input.indicatorCode, input.witnessName, input.paths)
    c.activity.log('evidence.add', `${input.indicatorCode} / ${input.witnessName}: ${r.added.length} ملف`)
    notify()
    return r
  })
  handle('evidence.remove', ({ id }) => { const e = c.evidence.get(id); c.evidence.remove(id); c.activity.log('evidence.remove', e?.fileName ?? String(id)); notify() })
  handle('evidence.restore', ({ id }) => { c.evidence.restore(id); c.activity.log('evidence.restore', String(id)); notify() })
  handle('evidence.purge', ({ id }) => { c.evidence.purge(id); notify() })
  handle('evidence.removeWitnessFiles', input => { const n = c.evidence.removeWitnessFiles(input.indicatorCode, input.witnessName); c.activity.log('evidence.removeWitness', `${input.indicatorCode} / ${input.witnessName}: ${n}`); notify(); return n })
  handle('evidence.setNote', ({ id, note }) => { c.evidence.setNote(id, note); notify() })
  handle('evidence.open', async ({ id }) => {
    const e = c.evidence.get(id)
    if (!e) throw new Error('الملف غير موجود')
    const abs = c.evidence.absolutePath(e)
    if (!fs.existsSync(abs)) throw new Error('الملف مفقود من القرص. ربما حُذف خارج البرنامج.')
    return shell.openPath(abs)
  })
  plain('evidence.showInFolder', (id: number) => { const e = c.evidence.get(id); if (e) shell.showItemInFolder(c.evidence.absolutePath(e)) })
  handle('evidence.previewUrl', ({ id }) => {
    const e = c.evidence.get(id)
    if (!e) throw new Error('الملف غير موجود')
    return `evidence://file/${id}/${encodeURIComponent(e.fileName)}`
  })
  plain('evidence.listTrash', () => c.evidence.listTrash())
  plain('evidence.integrity', () => c.evidence.integrityCheck())

  // ----- الشواهد المخصصة والتسميات
  plain('witness.listCustom', () => c.witness.listCustom())
  plain('witness.listLabels', () => c.witness.listLabels())
  handle('witness.addCustom', input => { const w = c.witness.addCustom(input.indicatorCode, input.name); c.activity.log('witness.addCustom', `${input.indicatorCode}: ${input.name}`); notify(); return w })
  handle('witness.removeCustom', ({ id }) => {
    const w = c.witness.getCustom(id)
    if (w) c.evidence.removeWitnessFiles(w.indicatorCode, w.name)
    c.witness.removeCustom(id)
    c.activity.log('witness.removeCustom', w?.name ?? String(id))
    notify()
  })
  handle('witness.rename', input => { c.witness.rename(input.indicatorCode, input.originalName, input.displayName); notify() })
  handle('witness.resetName', input => { c.witness.resetName(input.indicatorCode, input.originalName); notify() })

  // ----- النسخ الاحتياطي
  plain('backup.create', () => { const b = c.backup.create('manual'); c.activity.log('backup.create', b.fileName); return b })
  plain('backup.exportTo', async () => {
    const school = c.school.get()?.name ?? 'school'
    const result = await saveDialog({
      title: 'حفظ نسخة احتياطية',
      defaultPath: path.join(app.getPath('documents'), `backup_${school}_${new Date().toISOString().slice(0, 10)}.zip`),
      filters: [{ name: 'نسخة احتياطية', extensions: ['zip'] }]
    })
    if (result.canceled || !result.filePath) return null
    const b = c.backup.create('manual', result.filePath)
    c.activity.log('backup.export', result.filePath)
    return b
  })
  plain('backup.list', () => c.backup.list())
  plain('backup.pickFile', async () => {
    const result = await openDialog({ title: 'اختر ملف النسخة الاحتياطية', properties: ['openFile'], filters: [{ name: 'نسخة احتياطية', extensions: ['zip'] }] })
    return result.canceled ? null : result.filePaths[0] ?? null
  })
  handle('backup.inspect', ({ path: p }) => c.backup.inspect(p))
  handle('backup.restore', async input => { const r = await c.backup.restore(input.path, input.mode); c.activity.log('backup.restore', `${input.mode}: ${path.basename(input.path)}`); notify(); return r })
  handle('backup.delete', ({ path: p }) => c.backup.delete(p))

  // ----- الإعدادات والقفل
  plain('settings.get', () => c.settings.get())
  handle('settings.save', input => c.settings.update(input))
  handle('pin.set', ({ pin }) => { c.settings.setPin(pin); c.activity.log('pin.set') })
  handle('pin.verify', ({ pin }) => c.settings.verifyPin(pin))
  handle('pin.clear', ({ pin }) => { if (!c.settings.verifyPin(pin)) return false; c.settings.clearPin(); c.activity.log('pin.clear'); return true })

  // ----- التحديث
  plain('update.status', () => updater.status())
  plain('update.check', () => updater.check())
  plain('update.download', () => updater.download())
  plain('update.install', () => updater.install())

  // ----- التقرير
  handle('report.exportPdf', async ({ html }) => {
    const school = c.school.get()?.name ?? 'school'
    const result = await saveDialog({
      title: 'حفظ التقرير PDF',
      defaultPath: path.join(app.getPath('documents'), `تقرير التقويم الذاتي - ${school}.pdf`),
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (result.canceled || !result.filePath) return null
    const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } })
    try {
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      const pdf = await win.webContents.printToPDF({ pageSize: 'A4', printBackground: true, margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 } })
      fs.writeFileSync(result.filePath, pdf)
      c.activity.log('report.pdf', result.filePath)
      return result.filePath
    } finally {
      win.destroy()
    }
  })

  // ----- السجل
  plain('activity.recent', () => c.activity.recent(60))
}
