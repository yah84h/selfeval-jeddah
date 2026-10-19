// واجهة window.api التي يكشفها preload للواجهة — عقد مُنمَّط واحد
import type { Input } from './ipc'
import type {
  ActivityEntry, AppInfo, AppSettings, BackupInfo, BackupManifest, Evidence, ProgressReport,
  RestoreResult, School, UpdateStatus, CustomWitness, WitnessLabel
} from './types'

export type AddFilesResult = { added: Evidence[]; errors: Array<{ file: string; error: string }> }

export interface Api {
  app: {
    info(): Promise<AppInfo>
    openDataDir(): Promise<void>
    openBackupsDir(): Promise<void>
    openExternal(url: string): Promise<void>
  }
  school: {
    get(): Promise<School | null>
    save(input: Input<'school.save'>): Promise<School>
  }
  progress: { get(): Promise<ProgressReport> }
  evidence: {
    pick(input: Input<'evidence.pick'>): Promise<AddFilesResult | null>
    addFromPaths(input: Input<'evidence.addFromPaths'>): Promise<AddFilesResult>
    remove(id: number): Promise<void>
    restore(id: number): Promise<void>
    purge(id: number): Promise<void>
    removeWitnessFiles(input: Input<'evidence.removeWitnessFiles'>): Promise<number>
    setNote(id: number, note: string): Promise<void>
    open(id: number): Promise<string>
    showInFolder(id: number): Promise<void>
    previewUrl(id: number): Promise<string>
    listTrash(): Promise<Evidence[]>
    integrity(): Promise<{ missing: Evidence[]; orphanFiles: string[] }>
  }
  witness: {
    listCustom(): Promise<CustomWitness[]>
    listLabels(): Promise<WitnessLabel[]>
    addCustom(input: Input<'witness.addCustom'>): Promise<CustomWitness>
    removeCustom(id: number): Promise<void>
    rename(input: Input<'witness.rename'>): Promise<void>
    resetName(input: Input<'witness.resetName'>): Promise<void>
  }
  backup: {
    create(): Promise<BackupInfo>
    exportTo(): Promise<BackupInfo | null>
    list(): Promise<BackupInfo[]>
    pickFile(): Promise<string | null>
    inspect(path: string): Promise<BackupManifest>
    restore(input: Input<'backup.restore'>): Promise<RestoreResult>
    delete(path: string): Promise<void>
  }
  settings: {
    get(): Promise<AppSettings>
    save(input: Input<'settings.save'>): Promise<AppSettings>
  }
  pin: {
    set(pin: string): Promise<void>
    verify(pin: string): Promise<boolean>
    clear(pin: string): Promise<boolean>
  }
  update: {
    status(): Promise<UpdateStatus>
    check(): Promise<UpdateStatus>
    download(): Promise<void>
    install(): Promise<void>
  }
  report: { exportPdf(html: string): Promise<string | null> }
  activity: { recent(): Promise<ActivityEntry[]> }
  /** مسار الملف الحقيقي لكائن File (للسحب والإفلات) */
  pathForFile(file: File): string
  onUpdateStatus(cb: (status: UpdateStatus) => void): () => void
  onDataChanged(cb: () => void): () => void
}
