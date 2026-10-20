// كل عمليات الشواهد في مكان واحد (رفع، حذف، تسمية، شواهد مخصصة) مع رسائل موحّدة
import { useState } from 'react'
import { toast } from 'sonner'
import { api, errorMessage } from '@/lib/api'
import { useDialogs } from '@/components/ui/DialogProvider'
import type { WitnessProgress } from '@shared/types'

export function useEvidenceActions() {
  const { confirm, prompt } = useDialogs()
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const run = async (key: string, fn: () => Promise<void>): Promise<void> => {
    setBusyKey(key)
    try { await fn() } catch (error) { toast.error(errorMessage(error)) } finally { setBusyKey(null) }
  }

  const reportAdd = (r: { added: unknown[]; errors: Array<{ file: string; error: string }> } | null): void => {
    if (!r) return
    if (r.added.length) toast.success(r.added.length === 1 ? 'تم حفظ الشاهد في ملف المدرسة' : `تم حفظ ${r.added.length} ملفات`)
    for (const e of r.errors) toast.error(`${e.file}: ${e.error}`)
  }

  return {
    busyKey,
    pick: (indicatorCode: string, witnessName: string) => run(`${indicatorCode}::${witnessName}`, async () => reportAdd(await api.evidence.pick({ indicatorCode, witnessName }))),
    drop: (indicatorCode: string, witnessName: string, files: File[]) => run(`${indicatorCode}::${witnessName}`, async () => {
      const paths = files.map(f => api.pathForFile(f)).filter(Boolean)
      if (!paths.length) { toast.error('تعذر قراءة مسار الملفات المسحوبة'); return }
      reportAdd(await api.evidence.addFromPaths({ indicatorCode, witnessName, paths }))
    }),
    removeFile: async (id: number, fileName: string) => {
      if (await confirm({ title: 'حذف الملف', message: <>سيُنقل الملف <b>{fileName}</b> إلى سلة المحذوفات ويمكن استعادته خلال 30 يومًا.</>, confirmText: 'نقل إلى السلة', danger: true })) {
        await run(`file-${id}`, async () => { await api.evidence.remove(id); toast.success('نُقل الملف إلى سلة المحذوفات') })
      }
    },
    removeWitnessFiles: async (indicatorCode: string, witness: WitnessProgress) => {
      if (!witness.files.length) { toast.info('لا توجد ملفات مرفوعة لهذا الشاهد'); return }
      if (await confirm({ title: 'حذف كل ملفات الشاهد', message: <>سيُنقل {witness.files.length} ملف(ات) الخاصة بـ <b>{witness.displayName}</b> إلى سلة المحذوفات.</>, confirmText: 'حذف الكل', danger: true })) {
        await run(`${indicatorCode}::${witness.name}`, async () => { const n = await api.evidence.removeWitnessFiles({ indicatorCode, witnessName: witness.name }); toast.success(`نُقل ${n} ملف(ات) إلى السلة`) })
      }
    },
    rename: async (indicatorCode: string, witness: WitnessProgress) => {
      const value = await prompt({ title: 'تعديل مسمى الوثيقة', label: 'المسمى الجديد كما سيظهر في ملف مدرستك', defaultValue: witness.displayName, validate: v => (v.length < 1 ? 'اكتب مسمى' : null) })
      if (value === null) return
      await run(`${indicatorCode}::${witness.name}`, async () => {
        if (value === witness.name) await api.witness.resetName({ indicatorCode, originalName: witness.name })
        else await api.witness.rename({ indicatorCode, originalName: witness.name, displayName: value })
        toast.success('تم تعديل المسمى')
      })
    },
    resetName: (indicatorCode: string, witness: WitnessProgress) => run(`${indicatorCode}::${witness.name}`, async () => { await api.witness.resetName({ indicatorCode, originalName: witness.name }); toast.success('أُعيد المسمى الأصلي') }),
    addCustom: async (indicatorCode: string) => {
      const name = await prompt({ title: 'إضافة شاهد غير مدرج', label: 'اسم الشاهد الجديد لهذا المؤشر', placeholder: 'مثال: محضر اجتماع لجنة التميز', validate: v => (v.length < 2 ? 'اكتب اسمًا من حرفين على الأقل' : null) })
      if (name === null) return
      await run(`custom-${indicatorCode}`, async () => { await api.witness.addCustom({ indicatorCode, name }); toast.success('تمت إضافة الشاهد المخصص') })
    },
    removeCustom: async (witness: WitnessProgress) => {
      if (!witness.customId) return
      const msg = witness.files.length ? <>سيُحذف الشاهد المخصص <b>{witness.displayName}</b> وتُنقل ملفاته ({witness.files.length}) إلى سلة المحذوفات.</> : <>سيُحذف الشاهد المخصص <b>{witness.displayName}</b>.</>
      if (await confirm({ title: 'حذف الشاهد المخصص', message: msg, confirmText: 'حذف', danger: true })) {
        await run(`custom-${witness.customId}`, async () => { await api.witness.removeCustom(witness.customId!); toast.success('تم حذف الشاهد المخصص') })
      }
    },
    exclude: async (indicatorCode: string, witness: WitnessProgress) => {
      const reason = await prompt({ title: 'استبعاد الشاهد — لا ينطبق على المدرسة', label: 'سبب الاستبعاد (اختياري، يظهر في التقرير)', placeholder: 'مثال: لا يوجد مرحلة ابتدائية في المدرسة', confirmText: 'استبعاد' })
      if (reason === null) return
      await run(`${indicatorCode}::${witness.name}`, async () => {
        await api.witness.exclude({ indicatorCode, originalName: witness.name, reason })
        toast.success('استُبعد الشاهد من الحساب والتقرير' + (witness.files.length ? ' — ملفاته محفوظة ولم تُحذف' : ''))
      })
    },
    include: (indicatorCode: string, witness: WitnessProgress) => run(`${indicatorCode}::${witness.name}`, async () => { await api.witness.include({ indicatorCode, originalName: witness.name }); toast.success('أُعيد تفعيل الشاهد') }),
    excludeIndicator: async (indicatorCode: string) => {
      const reason = await prompt({ title: 'استبعاد المؤشر كاملًا — لا ينطبق على المدرسة', label: 'سبب الاستبعاد (اختياري، يظهر في التقرير)', confirmText: 'استبعاد كل شواهد المؤشر' })
      if (reason === null) return
      await run(`ind-${indicatorCode}`, async () => { const n = await api.witness.excludeIndicator({ indicatorCode, reason }); toast.success(`استُبعد ${n} شاهد(ات)`) })
    },
    includeIndicator: (indicatorCode: string) => run(`ind-${indicatorCode}`, async () => { await api.witness.includeIndicator({ indicatorCode }); toast.success('أُعيد تفعيل شواهد المؤشر') }),
    setNote: async (id: number, current: string) => {
      const note = await prompt({ title: 'ملاحظة على الملف', label: 'ملاحظة تظهر بجوار الملف (اختياري)', defaultValue: current })
      if (note === null) return
      await run(`file-${id}`, async () => { await api.evidence.setNote(id, note); toast.success('تم حفظ الملاحظة') })
    }
  }
}
