import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { LockKeyhole, School } from 'lucide-react'
import { toast } from 'sonner'
import { api, errorMessage } from '@/lib/api'
import { keys } from '@/lib/queries'
import { Button } from '@/components/ui/Button'
import { Field, inputClass } from '@/components/ui/Card'
import { Logo } from '@/components/Logo'
import { indicatorCount, witnessCount } from '@shared/evaluationData'

export function OnboardingPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', ministryNumber: '', stage: '', gender: '', principal: '', coordinator: '' })
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (form.name.trim().length < 2) { toast.error('اكتب اسم المدرسة'); return }
    setSaving(true)
    try {
      await api.school.save(form)
      await qc.invalidateQueries({ queryKey: keys.school })
      toast.success('تم إنشاء ملف المدرسة. البيانات محفوظة على هذا الجهاز فقط.')
    } catch (error) { toast.error(errorMessage(error)) } finally { setSaving(false) }
  }

  return (
    <div className="grid h-full grid-cols-[1.1fr_1fr] overflow-hidden">
      <section className="relative flex flex-col justify-center bg-gradient-to-br from-primary to-[#7139db] px-14 text-white">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-teal via-[#5fd3cf] to-teal" />
        <div className="w-fit rounded-2xl bg-white px-5 py-3 shadow-lg"><Logo size={72} /></div>
        <h1 className="mt-6 text-4xl font-extrabold leading-snug">دليل التقويم <span className="text-[#9fe9e5]">المدرسي</span></h1>
        <p className="mt-3 max-w-md text-base leading-8 text-white/85">الدليل الإجرائي للتقويم المدرسي الذاتي للاعتماد المدرسي — نظام مثبَّت على جهاز المدرسة يحفظ شواهدها محليًا ويتابع إنجازها.</p>
        <div className="mt-8 flex gap-6">
          {[['4', 'مجالات'], [String(indicatorCount), 'مؤشرًا'], [String(witnessCount), 'شاهدًا مطلوبًا']].map(([n, l]) => (
            <div key={l}><div className="text-3xl font-extrabold">{n}</div><div className="text-sm text-white/75">{l}</div></div>
          ))}
        </div>
        <div className="mt-10 flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm"><LockKeyhole size={16} /> بيانات المدرسة وملفاتها تبقى على هذا الجهاز ولا تُرفع إلى أي خادم.</div>
      </section>

      <section className="flex items-center justify-center overflow-auto px-12 py-10">
        <form onSubmit={submit} className="w-full max-w-md space-y-4">
          <div className="mb-6">
            <div className="mb-2 grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary"><School size={22} /></div>
            <h2 className="text-2xl font-extrabold">إعداد ملف المدرسة</h2>
            <p className="mt-1 text-sm text-muted">يُطلب مرة واحدة فقط. يمكنك تعديل هذه البيانات لاحقًا من الإعدادات.</p>
          </div>
          <Field label="اسم المدرسة *"><input className={inputClass} autoFocus value={form.name} onChange={set('name')} placeholder="مثال: مدرسة الموهوبين التقنية الثانوية" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الرقم الوزاري"><input className={inputClass} value={form.ministryNumber} onChange={set('ministryNumber')} /></Field>
            <Field label="المرحلة">
              <select className={inputClass} value={form.stage} onChange={set('stage')}>
                <option value="">—</option><option>ابتدائي</option><option>متوسط</option><option>ثانوي</option><option>مجمع تعليمي</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="النوع">
              <select className={inputClass} value={form.gender} onChange={set('gender')}>
                <option value="">—</option><option>بنين</option><option>بنات</option>
              </select>
            </Field>
            <Field label="قائد/ة المدرسة"><input className={inputClass} value={form.principal} onChange={set('principal')} /></Field>
          </div>
          <Field label="منسق/ة التقويم الذاتي"><input className={inputClass} value={form.coordinator} onChange={set('coordinator')} /></Field>
          <Button type="submit" size="lg" className="w-full" loading={saving}>إنشاء الملف والبدء</Button>
        </form>
      </section>
    </div>
  )
}
