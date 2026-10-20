// الشواهد المخصصة (التي تضيفها المدرسة) + التسميات المعدّلة للشواهد
import type { Database } from '../db/database'
import type { CustomWitness, WitnessLabel, WitnessExclusion } from '@shared/types'
import { findIndicator } from '@shared/evaluationData'
import { nowIso } from './paths'

type CustomRow = { id: number; indicator_code: string; name: string; created_at: string }
type LabelRow = { indicator_code: string; original_name: string; display_name: string }
type ExclusionRow = { indicator_code: string; original_name: string; reason: string }

export function createWitnessService(db: Database) {
  const assertIndicator = (code: string): void => {
    if (!findIndicator(code)) throw new Error(`المؤشر ${code} غير موجود في الدليل`)
  }

  return {
    listCustom(): CustomWitness[] {
      return db.all<CustomRow>('SELECT * FROM custom_witness ORDER BY id').map(r => ({ id: r.id, indicatorCode: r.indicator_code, name: r.name, createdAt: r.created_at }))
    },
    addCustom(indicatorCode: string, name: string): CustomWitness {
      assertIndicator(indicatorCode)
      const indicator = findIndicator(indicatorCode)!
      if (indicator.requiredDocuments.includes(name)) throw new Error('هذا الشاهد موجود أصلًا ضمن الشواهد المطلوبة للمؤشر')
      const dup = db.get('SELECT id FROM custom_witness WHERE indicator_code = ? AND name = ?', [indicatorCode, name])
      if (dup) throw new Error('هذا الشاهد المخصص مضاف مسبقًا لهذا المؤشر')
      const { lastId } = db.run('INSERT INTO custom_witness (indicator_code, name, created_at) VALUES (?, ?, ?)', [indicatorCode, name, nowIso()])
      return { id: lastId, indicatorCode, name, createdAt: nowIso() }
    },
    getCustom(id: number): CustomWitness | undefined {
      const r = db.get<CustomRow>('SELECT * FROM custom_witness WHERE id = ?', [id])
      return r ? { id: r.id, indicatorCode: r.indicator_code, name: r.name, createdAt: r.created_at } : undefined
    },
    removeCustom(id: number): void {
      db.run('DELETE FROM custom_witness WHERE id = ?', [id])
    },
    listLabels(): WitnessLabel[] {
      return db.all<LabelRow>('SELECT indicator_code, original_name, display_name FROM witness_label').map(r => ({ indicatorCode: r.indicator_code, originalName: r.original_name, displayName: r.display_name }))
    },
    rename(indicatorCode: string, originalName: string, displayName: string): void {
      assertIndicator(indicatorCode)
      if (displayName === originalName) { this.resetName(indicatorCode, originalName); return }
      db.run(
        `INSERT INTO witness_label (indicator_code, original_name, display_name, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT (indicator_code, original_name) DO UPDATE SET display_name = excluded.display_name, updated_at = excluded.updated_at`,
        [indicatorCode, originalName, displayName, nowIso()]
      )
    },
    resetName(indicatorCode: string, originalName: string): void {
      db.run('DELETE FROM witness_label WHERE indicator_code = ? AND original_name = ?', [indicatorCode, originalName])
    },

    // ----- «لا ينطبق»: استبعاد شاهد من الحساب والتقرير
    listExcluded(): WitnessExclusion[] {
      return db.all<ExclusionRow>('SELECT indicator_code, original_name, reason FROM witness_exclusion').map(r => ({ indicatorCode: r.indicator_code, originalName: r.original_name, reason: r.reason }))
    },
    exclude(indicatorCode: string, originalName: string, reason = ''): void {
      const indicator = findIndicator(indicatorCode)
      if (!indicator) throw new Error(`المؤشر ${indicatorCode} غير موجود في الدليل`)
      if (!indicator.requiredDocuments.includes(originalName)) throw new Error('يمكن استبعاد الشواهد الأصلية فقط؛ الشاهد المخصص يُحذف بدلًا من ذلك')
      db.run(
        `INSERT INTO witness_exclusion (indicator_code, original_name, reason, created_at) VALUES (?, ?, ?, ?)
         ON CONFLICT (indicator_code, original_name) DO UPDATE SET reason = excluded.reason`,
        [indicatorCode, originalName, reason, nowIso()]
      )
    },
    include(indicatorCode: string, originalName: string): void {
      db.run('DELETE FROM witness_exclusion WHERE indicator_code = ? AND original_name = ?', [indicatorCode, originalName])
    },
    excludeIndicator(indicatorCode: string, reason = ''): number {
      const indicator = findIndicator(indicatorCode)
      if (!indicator) throw new Error(`المؤشر ${indicatorCode} غير موجود في الدليل`)
      db.transaction(() => { for (const name of indicator.requiredDocuments) this.exclude(indicatorCode, name, reason) })
      return indicator.requiredDocuments.length
    },
    includeIndicator(indicatorCode: string): number {
      return db.run('DELETE FROM witness_exclusion WHERE indicator_code = ?', [indicatorCode]).changes
    }
  }
}

export type WitnessService = ReturnType<typeof createWitnessService>
