// جسر آمن بين الواجهة والعملية الرئيسية — يكشف window.api فقط
import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { Api } from '@shared/api'
import { EVENTS } from '@shared/events'

const invoke = <T>(channel: string, payload?: unknown): Promise<T> => ipcRenderer.invoke(channel, payload) as Promise<T>

const subscribe = <T>(channel: string, cb: (payload: T) => void): (() => void) => {
  const listener = (_event: Electron.IpcRendererEvent, payload: T): void => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: Api = {
  app: {
    info: () => invoke('app.info'),
    openDataDir: () => invoke('app.openDataDir'),
    openBackupsDir: () => invoke('app.openBackupsDir'),
    openExternal: url => invoke('app.openExternal', url)
  },
  school: {
    get: () => invoke('school.get'),
    save: input => invoke('school.save', input)
  },
  progress: { get: () => invoke('progress.get') },
  evidence: {
    pick: input => invoke('evidence.pick', input),
    addFromPaths: input => invoke('evidence.addFromPaths', input),
    remove: id => invoke('evidence.remove', { id }),
    restore: id => invoke('evidence.restore', { id }),
    purge: id => invoke('evidence.purge', { id }),
    removeWitnessFiles: input => invoke('evidence.removeWitnessFiles', input),
    setNote: (id, note) => invoke('evidence.setNote', { id, note }),
    open: id => invoke('evidence.open', { id }),
    showInFolder: id => invoke('evidence.showInFolder', id),
    previewUrl: id => invoke('evidence.previewUrl', { id }),
    listTrash: () => invoke('evidence.listTrash'),
    integrity: () => invoke('evidence.integrity')
  },
  witness: {
    listCustom: () => invoke('witness.listCustom'),
    listLabels: () => invoke('witness.listLabels'),
    addCustom: input => invoke('witness.addCustom', input),
    removeCustom: id => invoke('witness.removeCustom', { id }),
    rename: input => invoke('witness.rename', input),
    resetName: input => invoke('witness.resetName', input),
    listExcluded: () => invoke('witness.listExcluded'),
    exclude: input => invoke('witness.exclude', input),
    include: input => invoke('witness.include', input),
    excludeIndicator: input => invoke('witness.excludeIndicator', input),
    includeIndicator: input => invoke('witness.includeIndicator', input)
  },
  backup: {
    create: () => invoke('backup.create'),
    exportTo: () => invoke('backup.exportTo'),
    list: () => invoke('backup.list'),
    pickFile: () => invoke('backup.pickFile'),
    inspect: p => invoke('backup.inspect', { path: p }),
    restore: input => invoke('backup.restore', input),
    delete: p => invoke('backup.delete', { path: p })
  },
  settings: {
    get: () => invoke('settings.get'),
    save: input => invoke('settings.save', input)
  },
  pin: {
    set: pin => invoke('pin.set', { pin }),
    verify: pin => invoke('pin.verify', { pin }),
    clear: pin => invoke('pin.clear', { pin })
  },
  update: {
    status: () => invoke('update.status'),
    check: () => invoke('update.check'),
    download: () => invoke('update.download'),
    install: () => invoke('update.install')
  },
  report: { exportPdf: html => invoke('report.exportPdf', { html }) },
  activity: { recent: () => invoke('activity.recent') },
  pathForFile: file => webUtils.getPathForFile(file),
  onUpdateStatus: cb => subscribe(EVENTS.updateStatus, cb),
  onDataChanged: cb => subscribe(EVENTS.dataChanged, cb)
}

contextBridge.exposeInMainWorld('api', api)
