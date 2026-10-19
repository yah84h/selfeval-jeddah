// الأنواع المشتركة بين العملية الرئيسية (main) والواجهة (renderer)

export type School = {
  name: string
  ministryNumber: string
  stage: string
  gender: string
  principal: string
  coordinator: string
  createdAt: string
}

export type Evidence = {
  id: number
  indicatorCode: string
  witnessName: string
  fileName: string
  storedName: string
  mimeType: string
  fileSize: number
  note: string
  createdAt: string
  deletedAt: string | null
}

export type CustomWitness = {
  id: number
  indicatorCode: string
  name: string
  createdAt: string
}

export type WitnessLabel = {
  indicatorCode: string
  originalName: string
  displayName: string
}

export type WitnessProgress = {
  name: string
  displayName: string
  isCustom: boolean
  customId?: number
  files: Evidence[]
  complete: boolean
}

export type IndicatorProgress = {
  code: string
  text: string
  witnesses: WitnessProgress[]
  completed: number
  total: number
}

export type CriterionProgress = {
  id: string
  name: string
  indicators: IndicatorProgress[]
  completed: number
  total: number
}

export type DomainProgress = {
  id: number
  name: string
  icon: string
  criteria: CriterionProgress[]
  completed: number
  total: number
}

export type ProgressReport = {
  domains: DomainProgress[]
  total: number
  completed: number
  percent: number
  uploadedFiles: number
  missing: Array<{ indicatorCode: string; indicatorText: string; witnessName: string; domainId: number }>
}

export type AppSettings = {
  dataDir: string
  autoBackup: boolean
  autoBackupKeep: number
  pinEnabled: boolean
  lastAutoBackupAt: string | null
  lastUpdateCheckAt: string | null
}

export type AppInfo = {
  version: string
  platform: NodeJS.Platform
  isPackaged: boolean
  dataDir: string
  userDataDir: string
  schemaVersion: number
}

export type BackupInfo = {
  path: string
  fileName: string
  size: number
  createdAt: string
  kind: 'manual' | 'auto' | 'pre-update' | 'pre-restore' | 'external'
}

export type BackupManifest = {
  app: 'selfeval-jeddah'
  appVersion: string
  schemaVersion: number
  createdAt: string
  schoolName: string
  evidenceCount: number
  kind: BackupInfo['kind']
}

export type RestoreMode = 'replace' | 'merge'

export type RestoreResult = {
  mode: RestoreMode
  addedEvidence: number
  skippedEvidence: number
  addedCustomWitnesses: number
  updatedLabels: number
}

export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'dev' }
  | { state: 'checking' }
  | { state: 'not-available'; currentVersion: string }
  | { state: 'available'; version: string; releaseNotes: string; releaseDate: string }
  | { state: 'downloading'; percent: number; transferred: number; total: number; bytesPerSecond: number }
  | { state: 'downloaded'; version: string }
  | { state: 'error'; message: string }

export type ActivityEntry = {
  id: number
  action: string
  details: string
  createdAt: string
}

export type OpenResult = { ok: true } | { ok: false; error: string }
