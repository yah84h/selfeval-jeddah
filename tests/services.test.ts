import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createContainer, type Container } from '../src/main/services/container'
import { allIndicators, domains, indicatorCount, witnessCount } from '../src/shared/evaluationData'
import { computeProgress } from '../src/main/services/progressService'

let root: string
let c: Container

const makeFile = (name: string, content = 'hello'): string => {
  const p = path.join(root, 'src', name)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, content)
  return p
}

const boot = async (): Promise<Container> =>
  createContainer({ settingsFile: path.join(root, 'userData', 'settings.json'), defaultDataDir: path.join(root, 'userData', 'data'), appVersion: '1.0.0-test' })

beforeEach(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'selfeval-'))
  c = await boot()
})
afterEach(() => {
  c.close()
  fs.rmSync(root, { recursive: true, force: true })
})

describe('بيانات الدليل', () => {
  it('4 مجالات و52 مؤشرًا ولكل مؤشر شاهد واحد على الأقل', () => {
    expect(domains).toHaveLength(4)
    expect(indicatorCount).toBe(52)
    expect(allIndicators.every(i => i.requiredDocuments.length > 0)).toBe(true)
    expect(witnessCount).toBeGreaterThan(indicatorCount)
    expect(new Set(allIndicators.map(i => i.code)).size).toBe(indicatorCount)
  })
})

describe('قاعدة البيانات والترحيلات', () => {
  it('تُنشأ القاعدة وتُطبَّق الترحيلات وتبقى بعد إعادة الفتح', async () => {
    expect(fs.existsSync(c.paths.dbFile)).toBe(true)
    expect(c.db.schemaVersion).toBe(c.schemaVersion)
    c.school.save({ name: 'مدرسة الاختبار', ministryNumber: '123', stage: 'ثانوي', gender: 'بنين', principal: '', coordinator: '' })
    c.close()
    c = await boot()
    expect(c.school.get()?.name).toBe('مدرسة الاختبار')
  })
})

describe('الشواهد', () => {
  it('رفع ملف بالاسم العربي، ثم حذف للسلة، ثم استعادة، ثم حذف نهائي', () => {
    const file = makeFile('الخطة التشغيلية.pdf', 'PDF')
    const code = allIndicators[0].code
    const witness = allIndicators[0].requiredDocuments[0]
    const { added, errors } = c.evidence.addFromPaths(code, witness, [file])
    expect(errors).toEqual([])
    expect(added).toHaveLength(1)
    expect(added[0].fileName).toBe('الخطة التشغيلية.pdf')
    const abs = c.evidence.absolutePath(added[0])
    expect(fs.existsSync(abs)).toBe(true)
    expect(abs).toContain('الخطة التشغيلية.pdf')

    c.evidence.remove(added[0].id)
    expect(c.evidence.list()).toHaveLength(0)
    expect(c.evidence.listTrash()).toHaveLength(1)
    expect(fs.existsSync(abs)).toBe(false)

    const restored = c.evidence.restore(added[0].id)!
    expect(restored.deletedAt).toBeNull()
    expect(fs.existsSync(c.evidence.absolutePath(restored))).toBe(true)

    c.evidence.purge(restored.id)
    expect(c.evidence.list()).toHaveLength(0)
    expect(fs.existsSync(c.evidence.absolutePath(restored))).toBe(false)
  })

  it('يرفض الأنواع غير المدعومة والمؤشرات غير الموجودة', () => {
    const bad = makeFile('virus.exe')
    const { added, errors } = c.evidence.addFromPaths(allIndicators[0].code, allIndicators[0].requiredDocuments[0], [bad])
    expect(added).toHaveLength(0)
    expect(errors[0].error).toContain('غير مدعوم')
    expect(() => c.evidence.addFromPaths('(9-9-9-9)', 'x', [bad])).toThrow()
    expect(() => c.evidence.addFromPaths(allIndicators[0].code, 'شاهد غير موجود', [makeFile('ok.pdf')])).toThrow('ليس من شواهد')
  })

  it('أسماء الملفات المكررة لا تتعارض', () => {
    const a = makeFile('a/ملف.pdf', '1')
    const b = makeFile('b/ملف.pdf', '22')
    const r = c.evidence.addFromPaths(allIndicators[0].code, allIndicators[0].requiredDocuments[0], [a, b])
    expect(r.added.map(e => path.posix.basename(e.storedName))).toEqual(['ملف.pdf', 'ملف (2).pdf'])
  })
})

describe('حساب الإنجاز', () => {
  it('النسبة والناقص يُحسبان من الشواهد المطلوبة + المخصصة', () => {
    const empty = computeProgress([], [], [])
    expect(empty.total).toBe(witnessCount)
    expect(empty.percent).toBe(0)
    expect(empty.missing).toHaveLength(witnessCount)

    const ind = allIndicators[0]
    c.witness.addCustom(ind.code, 'شاهد إضافي')
    c.witness.rename(ind.code, ind.requiredDocuments[0], 'اسم معدّل')
    c.evidence.addFromPaths(ind.code, ind.requiredDocuments[0], [makeFile('x.pdf')])
    const p = c.progress.get()
    expect(p.total).toBe(witnessCount + 1)
    expect(p.completed).toBe(1)
    const w = p.domains[0].criteria[0].indicators[0].witnesses
    expect(w[0].displayName).toBe('اسم معدّل')
    expect(w[0].complete).toBe(true)
    expect(w.at(-1)?.isCustom).toBe(true)
  })

  it('يرفض شاهدًا مخصصًا مكررًا', () => {
    const ind = allIndicators[0]
    c.witness.addCustom(ind.code, 'س')
    expect(() => c.witness.addCustom(ind.code, 'س')).toThrow()
    expect(() => c.witness.addCustom(ind.code, ind.requiredDocuments[0])).toThrow()
  })
})

describe('الشواهد المستبعدة (لا ينطبق)', () => {
  it('الاستبعاد يخرج الشاهد من الإجمالي والناقص، والتفعيل يعيده، والمؤشر كاملًا', () => {
    const ind = allIndicators[3]
    const before = c.progress.get()
    c.witness.exclude(ind.code, ind.requiredDocuments[0], 'لا يوجد')
    const after = c.progress.get()
    expect(after.total).toBe(before.total - 1)
    expect(after.missing.length).toBe(before.missing.length - 1)
    const w = after.domains.flatMap(d => d.criteria).flatMap(cr => cr.indicators).find(i => i.code === ind.code)!.witnesses[0]
    expect(w.excluded).toBe(true)
    expect(w.excludeReason).toBe('لا يوجد')
    c.witness.include(ind.code, ind.requiredDocuments[0])
    expect(c.progress.get().total).toBe(before.total)

    expect(c.witness.excludeIndicator(ind.code)).toBe(ind.requiredDocuments.length)
    const p = c.progress.get()
    expect(p.total).toBe(before.total - ind.requiredDocuments.length)
    const crit = p.domains.flatMap(d => d.criteria).find(cr => cr.indicators.some(i => i.code === ind.code))!
    const na = crit.indicators.find(i => i.code === ind.code)!
    expect(na.total).toBe(0)
    expect(na.notApplicable).toBe(true)
    // إعادة الترقيم: المؤشرات المتبقية مرقّمة تسلسليًا بلا فجوة
    const seqs = crit.indicators.filter(i => !i.notApplicable).map(i => Number(i.displayCode.replace(/^\(|\)$/g, '').split('-').pop()))
    expect(seqs).toEqual(seqs.map((_, k) => k + 1))
    c.witness.includeIndicator(ind.code)
    expect(c.progress.get().total).toBe(before.total)
    // لا يمكن استبعاد شاهد غير أصلي
    expect(() => c.witness.exclude(ind.code, 'شاهد وهمي')).toThrow()
  })

  it('الترحيل من إصدار أقدم (مخطط 1) إلى الحالي يحافظ على البيانات', async () => {
    // محاكاة قاعدة من الإصدار 1.0.0: نحذف جدول الاستبعاد ونعيد رقم المخطط إلى 1
    c.evidence.addFromPaths(allIndicators[0].code, allIndicators[0].requiredDocuments[0], [makeFile('old.pdf')])
    c.db.exec('DROP TABLE witness_exclusion'); c.db.exec('DELETE FROM schema_migrations WHERE version > 1'); c.db.exec('PRAGMA user_version = 1')
    c.close()
    c = await boot()
    expect(c.db.schemaVersion).toBe(c.schemaVersion)
    expect(c.evidence.list()).toHaveLength(1)
    c.witness.exclude(allIndicators[0].code, allIndicators[0].requiredDocuments[1])
    expect(c.witness.listExcluded()).toHaveLength(1)
  })
})

describe('النسخ الاحتياطي', () => {
  it('تصدير ← مسح ← استعادة (استبدال) = نفس البيانات', async () => {
    const ind = allIndicators[1]
    c.school.save({ name: 'مدرسة أ', ministryNumber: '', stage: '', gender: '', principal: '', coordinator: '' })
    c.witness.addCustom(ind.code, 'مخصص')
    c.evidence.addFromPaths(ind.code, ind.requiredDocuments[0], [makeFile('one.pdf', 'ONE'), makeFile('two.png', 'TWO')])
    const info = c.backup.create('manual')
    expect(fs.existsSync(info.path)).toBe(true)
    expect(c.backup.inspect(info.path).evidenceCount).toBe(2)

    // تخريب البيانات الحالية
    for (const e of c.evidence.list()) c.evidence.purge(e.id)
    c.school.save({ name: 'مدرسة ب', ministryNumber: '', stage: '', gender: '', principal: '', coordinator: '' })
    expect(c.evidence.list()).toHaveLength(0)

    const result = await c.backup.restore(info.path, 'replace')
    expect(result.addedEvidence).toBe(2)
    expect(c.school.get()?.name).toBe('مدرسة أ')
    expect(c.witness.listCustom()).toHaveLength(1)
    const list = c.evidence.list()
    expect(list).toHaveLength(2)
    for (const e of list) expect(fs.existsSync(c.evidence.absolutePath(e))).toBe(true)
    // نسخة ما قبل الاستعادة أُخذت تلقائيًا
    expect(c.backup.list().some(b => b.kind === 'pre-restore')).toBe(true)
  })

  it('الدمج يضيف الناقص فقط ولا يكرر الموجود', async () => {
    const ind = allIndicators[2]
    c.evidence.addFromPaths(ind.code, ind.requiredDocuments[0], [makeFile('keep.pdf', 'K')])
    const info = c.backup.create('manual')
    c.evidence.addFromPaths(ind.code, ind.requiredDocuments[0], [makeFile('later.pdf', 'L')])
    const result = await c.backup.restore(info.path, 'merge')
    expect(result.skippedEvidence).toBe(1)
    expect(result.addedEvidence).toBe(0)
    expect(c.evidence.list()).toHaveLength(2)
  })

  it('النسخ التلقائي يحتفظ بالعدد المحدد فقط', () => {
    c.evidence.addFromPaths(allIndicators[0].code, allIndicators[0].requiredDocuments[0], [makeFile('f.pdf')])
    c.settings.update({ autoBackupKeep: 2, lastAutoBackupAt: null })
    for (let i = 0; i < 4; i++) c.backup.create('auto')
    c.backup.pruneAuto(2)
    expect(c.backup.list().filter(b => b.kind === 'auto')).toHaveLength(2)
    const m = c.maintenance()
    expect(m.backedUp).toBe(true)
  })

  it('يرفض ملفًا ليس نسخة احتياطية', () => {
    const bogus = makeFile('bogus.zip', 'not a zip')
    expect(() => c.backup.inspect(bogus)).toThrow()
  })
})

describe('رمز القفل', () => {
  it('ضبط والتحقق وإزالة', () => {
    expect(c.settings.verifyPin('anything')).toBe(true)
    c.settings.setPin('1234')
    expect(c.settings.get().pinEnabled).toBe(true)
    expect(c.settings.verifyPin('0000')).toBe(false)
    expect(c.settings.verifyPin('1234')).toBe(true)
    c.settings.clearPin()
    expect(c.settings.get().pinEnabled).toBe(false)
  })
})
