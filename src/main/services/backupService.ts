// النسخ الاحتياطي والاستعادة
// النسخة = ملف zip يحوي: manifest.json + data.db + evidence/**
// الاستعادة: استبدال (كل شيء من النسخة) أو دمج (إضافة ما ينقص فقط دون المساس بالموجود)
import fs from 'node:fs'
import path from 'node:path'
import AdmZip from 'adm-zip'
import { Database } from '../db/database'
import { CURRENT_SCHEMA_VERSION } from '../db/migrations'
import type { BackupInfo, BackupManifest, RestoreMode, RestoreResult } from '@shared/types'
import { fileStamp, nowIso, safeSegment, uniqueFileName, witnessDir, type DataPaths } from './paths'
import { mimeFor } from './evidenceService'

export type BackupContext = {
  paths: DataPaths
  appVersion: string
  wasmCandidates: string[]
  getDb: () => Database
  /** يُغلق القاعدة الحالية ويعيد فتحها من الملف (بعد الاستبدال). */
  reopenDb: () => Promise<Database>
  schoolName: () => string
  evidenceCount: () => number
}

const KIND_PREFIX: Record<BackupInfo['kind'], string> = {
  manual: 'backup', auto: 'auto', 'pre-update': 'pre-update', 'pre-restore': 'pre-restore', external: 'external'
}

export function createBackupService(ctx: BackupContext) {
  const { paths } = ctx

  const addDirToZip = (zip: AdmZip, dir: string, zipRoot: string): void => {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      const rel = `${zipRoot}/${entry.name}`
      if (entry.isDirectory()) addDirToZip(zip, full, rel)
      else zip.addLocalFile(full, path.posix.dirname(rel), entry.name)
    }
  }

  const readManifest = (zip: AdmZip): BackupManifest => {
    const entry = zip.getEntry('manifest.json')
    if (!entry) throw new Error('الملف ليس نسخة احتياطية صالحة (manifest.json مفقود)')
    const manifest = JSON.parse(entry.getData().toString('utf-8')) as BackupManifest
    if (manifest.app !== 'selfeval-jeddah') throw new Error('هذه النسخة الاحتياطية لا تخص هذا البرنامج')
    if (!zip.getEntry('data.db')) throw new Error('النسخة الاحتياطية تالفة (data.db مفقود)')
    return manifest
  }

  const service = {
    create(kind: BackupInfo['kind'] = 'manual', targetPath?: string): BackupInfo {
      fs.mkdirSync(paths.backupsDir, { recursive: true })
      const db = ctx.getDb()
      db.save()
      const manifest: BackupManifest = {
        app: 'selfeval-jeddah',
        appVersion: ctx.appVersion,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        createdAt: nowIso(),
        schoolName: ctx.schoolName(),
        evidenceCount: ctx.evidenceCount(),
        kind
      }
      const zip = new AdmZip()
      zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'))
      zip.addFile('data.db', Buffer.from(db.export()))
      addDirToZip(zip, paths.evidenceDir, 'evidence')
      const fileName = `${KIND_PREFIX[kind]}_${safeSegment(manifest.schoolName || 'school')}_${fileStamp()}.zip`
      const finalPath = targetPath ?? path.join(paths.backupsDir, uniqueFileName(paths.backupsDir, fileName))
      zip.writeZip(finalPath)
      const stat = fs.statSync(finalPath)
      return { path: finalPath, fileName: path.basename(finalPath), size: stat.size, createdAt: manifest.createdAt, kind }
    },

    list(): BackupInfo[] {
      if (!fs.existsSync(paths.backupsDir)) return []
      const items: BackupInfo[] = []
      for (const name of fs.readdirSync(paths.backupsDir)) {
        if (!name.endsWith('.zip')) continue
        const full = path.join(paths.backupsDir, name)
        try {
          const stat = fs.statSync(full)
          const kind = (Object.entries(KIND_PREFIX).find(([, prefix]) => name.startsWith(`${prefix}_`))?.[0] ?? 'external') as BackupInfo['kind']
          items.push({ path: full, fileName: name, size: stat.size, createdAt: stat.mtime.toISOString(), kind })
        } catch { /* تجاهل الملفات غير القابلة للقراءة */ }
      }
      return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },

    inspect(zipPath: string): BackupManifest {
      if (!fs.existsSync(zipPath)) throw new Error('ملف النسخة الاحتياطية غير موجود')
      return readManifest(new AdmZip(zipPath))
    },

    delete(zipPath: string): void {
      const resolved = path.resolve(zipPath)
      if (!resolved.startsWith(path.resolve(paths.backupsDir) + path.sep)) throw new Error('لا يمكن حذف ملف خارج مجلد النسخ الاحتياطية')
      fs.rmSync(resolved, { force: true })
    },

    /** يحذف النسخ التلقائية الأقدم ويُبقي آخر `keep` نسخة. */
    pruneAuto(keep: number): number {
      const auto = service.list().filter(b => b.kind === 'auto')
      const extra = auto.slice(keep)
      for (const item of extra) fs.rmSync(item.path, { force: true })
      return extra.length
    },

    async restore(zipPath: string, mode: RestoreMode): Promise<RestoreResult> {
      const zip = new AdmZip(zipPath)
      const manifest = readManifest(zip)
      if (manifest.schemaVersion > CURRENT_SCHEMA_VERSION) {
        throw new Error('النسخة الاحتياطية أُنشئت بإصدار أحدث من هذا البرنامج. حدّث البرنامج ثم أعد المحاولة.')
      }
      // شبكة أمان: نسخة قبل أي استعادة
      service.create('pre-restore')
      return mode === 'replace' ? service.restoreReplace(zip) : service.restoreMerge(zip)
    },

    async restoreReplace(zip: AdmZip): Promise<RestoreResult> {
      const db = ctx.getDb()
      db.close()
      const staging = `${paths.evidenceDir}.restoring-${process.pid}`
      fs.rmSync(staging, { recursive: true, force: true })
      fs.mkdirSync(staging, { recursive: true })
      for (const entry of zip.getEntries()) {
        if (entry.isDirectory || !entry.entryName.startsWith('evidence/')) continue
        const rel = entry.entryName.slice('evidence/'.length)
        const target = path.join(staging, ...rel.split('/'))
        fs.mkdirSync(path.dirname(target), { recursive: true })
        fs.writeFileSync(target, entry.getData())
      }
      // تبديل ذرّي قدر الإمكان: الملفات أولًا ثم القاعدة
      fs.rmSync(paths.evidenceDir, { recursive: true, force: true })
      fs.renameSync(staging, paths.evidenceDir)
      const dbTmp = `${paths.dbFile}.tmp-restore`
      fs.writeFileSync(dbTmp, zip.getEntry('data.db')!.getData())
      fs.renameSync(dbTmp, paths.dbFile)
      await ctx.reopenDb() // يطبّق الترحيلات إن كانت النسخة من إصدار أقدم
      return { mode: 'replace', addedEvidence: ctx.evidenceCount(), skippedEvidence: 0, addedCustomWitnesses: 0, updatedLabels: 0 }
    },

    async restoreMerge(zip: AdmZip): Promise<RestoreResult> {
      const db = ctx.getDb()
      const source = await Database.openBuffer(zip.getEntry('data.db')!.getData(), ctx.wasmCandidates)
      const result: RestoreResult = { mode: 'merge', addedEvidence: 0, skippedEvidence: 0, addedCustomWitnesses: 0, updatedLabels: 0 }
      try {
        db.transaction(() => {
          // الشواهد المخصصة
          for (const row of source.all<{ indicator_code: string; name: string; created_at: string }>('SELECT * FROM custom_witness')) {
            const exists = db.get('SELECT id FROM custom_witness WHERE indicator_code = ? AND name = ?', [row.indicator_code, row.name])
            if (!exists) { db.run('INSERT INTO custom_witness (indicator_code, name, created_at) VALUES (?, ?, ?)', [row.indicator_code, row.name, row.created_at]); result.addedCustomWitnesses++ }
          }
          // التسميات: تُضاف الناقصة فقط
          for (const row of source.all<{ indicator_code: string; original_name: string; display_name: string; updated_at: string }>('SELECT * FROM witness_label')) {
            const exists = db.get('SELECT id FROM witness_label WHERE indicator_code = ? AND original_name = ?', [row.indicator_code, row.original_name])
            if (!exists) { db.run('INSERT INTO witness_label (indicator_code, original_name, display_name, updated_at) VALUES (?, ?, ?, ?)', [row.indicator_code, row.original_name, row.display_name, row.updated_at]); result.updatedLabels++ }
          }
          // الاستبعادات («لا ينطبق»): تُضاف الناقصة فقط
          for (const row of source.all<{ indicator_code: string; original_name: string; reason: string; created_at: string }>("SELECT * FROM witness_exclusion")) {
            const exists = db.get('SELECT id FROM witness_exclusion WHERE indicator_code = ? AND original_name = ?', [row.indicator_code, row.original_name])
            if (!exists) db.run('INSERT INTO witness_exclusion (indicator_code, original_name, reason, created_at) VALUES (?, ?, ?, ?)', [row.indicator_code, row.original_name, row.reason ?? '', row.created_at])
          }
          // الملفات: يُضاف ما لا يوجد له مطابق (نفس المؤشر والشاهد واسم الملف والحجم)
          type SrcRow = { indicator_code: string; witness_name: string; file_name: string; stored_name: string; mime_type: string; file_size: number; note: string; created_at: string }
          for (const row of source.all<SrcRow>('SELECT * FROM evidence WHERE deleted_at IS NULL')) {
            const exists = db.get('SELECT id FROM evidence WHERE indicator_code = ? AND witness_name = ? AND file_name = ? AND file_size = ? AND deleted_at IS NULL', [row.indicator_code, row.witness_name, row.file_name, row.file_size])
            if (exists) { result.skippedEvidence++; continue }
            const entry = zip.getEntry(`evidence/${row.stored_name}`)
            if (!entry) { result.skippedEvidence++; continue }
            const dir = witnessDir(paths, row.indicator_code, row.witness_name)
            fs.mkdirSync(dir, { recursive: true })
            const finalName = uniqueFileName(dir, path.posix.basename(row.stored_name))
            const destination = path.join(dir, finalName)
            fs.writeFileSync(destination, entry.getData())
            const storedName = path.relative(paths.evidenceDir, destination).split(path.sep).join('/')
            db.run('INSERT INTO evidence (indicator_code, witness_name, file_name, stored_name, mime_type, file_size, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [row.indicator_code, row.witness_name, row.file_name, storedName, row.mime_type || mimeFor(row.file_name), row.file_size, row.note ?? '', row.created_at])
            result.addedEvidence++
          }
        })
      } finally {
        source.close()
      }
      return result
    }
  }
  return service
}

export type BackupService = ReturnType<typeof createBackupService>
