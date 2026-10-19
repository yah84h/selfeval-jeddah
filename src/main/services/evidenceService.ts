// ملفات الشواهد: نسخ إلى مجلد البيانات، حذف إلى سلة قابلة للاستعادة، تنظيف دوري
import fs from 'node:fs'
import path from 'node:path'
import type { Database } from '../db/database'
import type { Evidence } from '@shared/types'
import { findIndicator } from '@shared/evaluationData'
import { ALLOWED_EXTENSIONS, MAX_FILE_BYTES } from '@shared/ipc'
import { evidenceFilePath, nowIso, safeSegment, uniqueFileName, witnessDir, type DataPaths } from './paths'

type Row = {
  id: number; indicator_code: string; witness_name: string; file_name: string; stored_name: string
  mime_type: string; file_size: number; note: string; created_at: string; deleted_at: string | null
}

const toEvidence = (r: Row): Evidence => ({
  id: r.id, indicatorCode: r.indicator_code, witnessName: r.witness_name, fileName: r.file_name,
  storedName: r.stored_name, mimeType: r.mime_type, fileSize: Number(r.file_size), note: r.note,
  createdAt: r.created_at, deletedAt: r.deleted_at
})

const MIME: Record<string, string> = {
  pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp',
  txt: 'text/plain', csv: 'text/csv', zip: 'application/zip', rar: 'application/vnd.rar'
}

export function mimeFor(fileName: string): string {
  const ext = path.extname(fileName).slice(1).toLowerCase()
  return MIME[ext] ?? 'application/octet-stream'
}

export const TRASH_RETENTION_DAYS = 30

export type AddResult = { added: Evidence[]; errors: Array<{ file: string; error: string }> }

export function createEvidenceService(db: Database, paths: DataPaths) {
  const rowById = (id: number): Row | undefined => db.get<Row>('SELECT * FROM evidence WHERE id = ?', [id])

  const service = {
    list(): Evidence[] {
      return db.all<Row>('SELECT * FROM evidence WHERE deleted_at IS NULL ORDER BY created_at DESC, id DESC').map(toEvidence)
    },
    listTrash(): Evidence[] {
      return db.all<Row>('SELECT * FROM evidence WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC').map(toEvidence)
    },
    get(id: number): Evidence | undefined {
      const row = rowById(id)
      return row ? toEvidence(row) : undefined
    },
    absolutePath(evidence: Evidence): string {
      return evidence.deletedAt
        ? path.join(paths.trashDir, evidence.storedName)
        : evidenceFilePath(paths, evidence.storedName)
    },

    /** ينسخ ملفات من مسارات على الجهاز إلى مجلد الشاهد ويسجّلها. */
    addFromPaths(indicatorCode: string, witnessName: string, sourcePaths: string[]): AddResult {
      const indicator = findIndicator(indicatorCode)
      if (!indicator) throw new Error(`المؤشر ${indicatorCode} غير موجود في الدليل`)
      const isCustom = Boolean(db.get('SELECT id FROM custom_witness WHERE indicator_code = ? AND name = ?', [indicatorCode, witnessName]))
      if (!indicator.requiredDocuments.includes(witnessName) && !isCustom) throw new Error(`الشاهد «${witnessName}» ليس من شواهد المؤشر ${indicatorCode}`)
      const result: AddResult = { added: [], errors: [] }
      const targetDir = witnessDir(paths, indicatorCode, witnessName)
      fs.mkdirSync(targetDir, { recursive: true })

      for (const source of sourcePaths) {
        const original = path.basename(source)
        try {
          const ext = path.extname(original).slice(1).toLowerCase()
          if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) throw new Error(`نوع الملف .${ext || '?'} غير مدعوم`)
          const stat = fs.statSync(source)
          if (!stat.isFile()) throw new Error('المسار ليس ملفًا')
          if (stat.size > MAX_FILE_BYTES) throw new Error(`حجم الملف يتجاوز ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} ميجابايت`)
          const cleanName = safeSegment(original, `file.${ext}`)
          const finalName = uniqueFileName(targetDir, cleanName)
          const destination = path.join(targetDir, finalName)
          fs.copyFileSync(source, destination)
          const storedName = path.relative(paths.evidenceDir, destination).split(path.sep).join('/')
          const createdAt = nowIso()
          const { lastId } = db.run(
            'INSERT INTO evidence (indicator_code, witness_name, file_name, stored_name, mime_type, file_size, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [indicatorCode, witnessName, original, storedName, mimeFor(original), stat.size, '', createdAt]
          )
          result.added.push(toEvidence({ id: lastId, indicator_code: indicatorCode, witness_name: witnessName, file_name: original, stored_name: storedName, mime_type: mimeFor(original), file_size: stat.size, note: '', created_at: createdAt, deleted_at: null }))
        } catch (error) {
          result.errors.push({ file: original, error: (error as Error).message })
        }
      }
      return result
    },

    setNote(id: number, note: string): void {
      db.run('UPDATE evidence SET note = ? WHERE id = ?', [note, id])
    },

    /** حذف إلى السلة (قابل للاستعادة خلال 30 يومًا). */
    remove(id: number): void {
      const row = rowById(id)
      if (!row || row.deleted_at) return
      const source = evidenceFilePath(paths, row.stored_name)
      fs.mkdirSync(paths.trashDir, { recursive: true })
      const trashName = `${row.id}__${path.basename(row.stored_name)}`
      if (fs.existsSync(source)) fs.renameSync(source, path.join(paths.trashDir, trashName))
      db.run('UPDATE evidence SET deleted_at = ?, stored_name = ? WHERE id = ?', [nowIso(), trashName, id])
    },

    removeWitnessFiles(indicatorCode: string, witnessName: string): number {
      const rows = db.all<Row>('SELECT * FROM evidence WHERE indicator_code = ? AND witness_name = ? AND deleted_at IS NULL', [indicatorCode, witnessName])
      db.transaction(() => { for (const row of rows) service.remove(row.id) })
      return rows.length
    },

    restore(id: number): Evidence | undefined {
      const row = rowById(id)
      if (!row || !row.deleted_at) return row ? toEvidence(row) : undefined
      const targetDir = witnessDir(paths, row.indicator_code, row.witness_name)
      fs.mkdirSync(targetDir, { recursive: true })
      const finalName = uniqueFileName(targetDir, row.stored_name.replace(/^\d+__/, ''))
      const destination = path.join(targetDir, finalName)
      const trashPath = path.join(paths.trashDir, row.stored_name)
      if (fs.existsSync(trashPath)) fs.renameSync(trashPath, destination)
      const storedName = path.relative(paths.evidenceDir, destination).split(path.sep).join('/')
      db.run('UPDATE evidence SET deleted_at = NULL, stored_name = ? WHERE id = ?', [storedName, id])
      return service.get(id)
    },

    /** حذف نهائي من السلة. */
    purge(id: number): void {
      const row = rowById(id)
      if (!row) return
      const file = row.deleted_at ? path.join(paths.trashDir, row.stored_name) : evidenceFilePath(paths, row.stored_name)
      if (fs.existsSync(file)) fs.rmSync(file, { force: true })
      db.run('DELETE FROM evidence WHERE id = ?', [id])
    },

    purgeExpired(days = TRASH_RETENTION_DAYS): number {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      const rows = db.all<Row>('SELECT * FROM evidence WHERE deleted_at IS NOT NULL AND deleted_at < ?', [cutoff])
      for (const row of rows) service.purge(row.id)
      return rows.length
    },

    /** يبلّغ عن الملفات المسجلة في القاعدة لكنها مفقودة على القرص (فحص السلامة). */
    integrityCheck(): { missing: Evidence[]; orphanFiles: string[] } {
      const missing = service.list().filter(e => !fs.existsSync(evidenceFilePath(paths, e.storedName)))
      const known = new Set(service.list().map(e => e.storedName))
      const orphanFiles: string[] = []
      const walk = (dir: string): void => {
        if (!fs.existsSync(dir)) return
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name)
          if (entry.isDirectory()) walk(full)
          else {
            const rel = path.relative(paths.evidenceDir, full).split(path.sep).join('/')
            if (!known.has(rel)) orphanFiles.push(rel)
          }
        }
      }
      walk(paths.evidenceDir)
      return { missing, orphanFiles }
    }
  }
  return service
}

export type EvidenceService = ReturnType<typeof createEvidenceService>
