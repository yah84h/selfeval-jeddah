// حاوية الخدمات: تركيب كل الخدمات حول قاعدة بيانات واحدة ومجلد بيانات واحد.
// لا تعتمد على Electron حتى يمكن اختبارها مباشرة في Node.
import { Database } from '../db/database'
import { CURRENT_SCHEMA_VERSION } from '../db/migrations'
import { buildDataPaths, ensureDataDirs, type DataPaths } from './paths'
import { createSchoolService } from './schoolService'
import { createWitnessService } from './witnessService'
import { createEvidenceService } from './evidenceService'
import { createProgressService } from './progressService'
import { createActivityService } from './activityService'
import { createBackupService } from './backupService'
import { createSettingsService } from './settingsService'

export type ContainerOptions = {
  settingsFile: string
  defaultDataDir: string
  appVersion: string
  wasmCandidates?: string[]
}

export async function createContainer(options: ContainerOptions) {
  const settings = createSettingsService(options.settingsFile, options.defaultDataDir)
  const paths: DataPaths = buildDataPaths(settings.get().dataDir)
  ensureDataDirs(paths)
  const wasmCandidates = options.wasmCandidates ?? []

  let db = await Database.open(paths.dbFile, wasmCandidates)

  const school = createSchoolService(db)
  const witness = createWitnessService(db)
  const evidence = createEvidenceService(db, paths)
  const activity = createActivityService(db)
  const progress = createProgressService(db, { evidence: () => evidence.list(), custom: () => witness.listCustom(), labels: () => witness.listLabels(), exclusions: () => witness.listExcluded() })

  // الخدمات تحمل مرجع db عند الإنشاء؛ عند إعادة الفتح نعيد تركيبها
  const container = {
    paths,
    settings,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    get db() { return db },
    school, witness, evidence, activity, progress,
    backup: undefined as unknown as ReturnType<typeof createBackupService>,
    async reopen(): Promise<Database> {
      db = await Database.open(paths.dbFile, wasmCandidates)
      rebind()
      return db
    },
    close(): void { db.close() },
    maintenance: (): { backedUp: boolean; purged: number } => ({ backedUp: false, purged: 0 })
  }

  const rebind = (): void => {
    Object.assign(container, {
      school: createSchoolService(db),
      witness: createWitnessService(db),
      evidence: createEvidenceService(db, paths),
      activity: createActivityService(db)
    })
    container.progress = createProgressService(db, { evidence: () => container.evidence.list(), custom: () => container.witness.listCustom(), labels: () => container.witness.listLabels(), exclusions: () => container.witness.listExcluded() })
  }

  container.backup = createBackupService({
    paths,
    appVersion: options.appVersion,
    wasmCandidates,
    getDb: () => db,
    reopenDb: () => container.reopen(),
    schoolName: () => container.school.get()?.name ?? '',
    evidenceCount: () => container.evidence.list().length
  })

  /** نسخة تلقائية يومية + تنظيف السلة — تُستدعى عند بدء التشغيل */
  container.maintenance = (): { backedUp: boolean; purged: number } => {
    const s = settings.get()
    let backedUp = false
    const purged = container.evidence.purgeExpired()
    if (s.autoBackup) {
      const last = s.lastAutoBackupAt ? new Date(s.lastAutoBackupAt).getTime() : 0
      const dayMs = 24 * 60 * 60 * 1000
      if (Date.now() - last > dayMs && container.evidence.list().length > 0) {
        container.backup.create('auto')
        container.backup.pruneAuto(s.autoBackupKeep)
        settings.update({ lastAutoBackupAt: new Date().toISOString() })
        backedUp = true
      }
    }
    return { backedUp, purged }
  }

  return container
}

export type Container = Awaited<ReturnType<typeof createContainer>>
