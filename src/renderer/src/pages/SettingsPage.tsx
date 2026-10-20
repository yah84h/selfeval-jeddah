import { useState } from 'react'
import { CheckCircle2, Download, Eye, EyeOff, FolderOpen, LockKeyhole, RefreshCw, RotateCw, School, ShieldAlert, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { useAppInfo, useProgress, useSchool, useSettings, useUpdateStatus, keys } from '@/lib/queries'
import { api, errorMessage } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { useDialogs } from '@/components/ui/DialogProvider'
import { Card, Field, SectionHeading, inputClass } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatDate, formatSize } from '@/lib/format'

export function SettingsPage() {
  return (
    <>
      <SectionHeading eyebrow="الإعدادات" title="الإعدادات والتحديث" description="تحديث البرنامج لا يمس بيانات المدرسة: البيانات في مجلد مستقل خارج مجلد التثبيت." />
      <div className="grid grid-cols-2 gap-5">
        <UpdateCard />
        <SchoolCard />
        <BackupSettingsCard />
        <PinCard />
        <ExcludedCard />
        <MaintenanceCard />
      </div>
    </>
  )
}

function UpdateCard() {
  const info = useAppInfo()
  const settings = useSettings()
  const status = useUpdateStatus()
  const qc = useQueryClient()
  const { confirm } = useDialogs()
  const s = status.data ?? { state: 'idle' as const }

  const check = async (): Promise<void> => { qc.setQueryData(keys.updateStatus, await api.update.check()); void qc.invalidateQueries({ queryKey: keys.settings }) }
  const install = async (): Promise<void> => {
    if (await confirm({ title: 'تثبيت التحديث', message: <>سيُغلق البرنامج ويُثبَّت الإصدار الجديد ثم يُعاد فتحه. بيانات المدرسة وملفاتها لن تتأثر، وستُؤخذ نسخة احتياطية تلقائيًا قبل التثبيت.</>, confirmText: 'تثبيت وإعادة التشغيل' })) await api.update.install()
  }

  return (
    <Card className="col-span-2 p-5">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal-soft text-teal"><RefreshCw size={22} className={s.state === 'checking' ? 'animate-spin' : ''} /></div>
        <div className="flex-1">
          <h3 className="text-base font-extrabold">تحديث النظام</h3>
          <p className="text-sm text-muted">الإصدار الحالي <b className="text-ink" dir="ltr">{info.data?.version}</b> · آخر تحقق: {formatDate(settings.data?.lastUpdateCheckAt)}</p>

          <div className="mt-3 rounded-xl bg-paper p-4 text-sm leading-7">
            {s.state === 'dev' && <span className="text-muted">وضع التطوير — التحديثات تعمل في النسخة المثبَّتة فقط.</span>}
            {s.state === 'idle' && <span className="text-muted">اضغط «التحقق من التحديثات» للبحث عن إصدار أحدث.</span>}
            {s.state === 'checking' && <span>جارٍ البحث عن تحديثات…</span>}
            {s.state === 'not-available' && <span className="flex items-center gap-2 text-success"><CheckCircle2 size={16} /> لديك أحدث إصدار ({s.currentVersion}).</span>}
            {s.state === 'available' && <div><b className="text-teal">إصدار جديد متاح: {s.version}</b>{s.releaseDate && <span className="text-xs text-muted"> · {formatDate(s.releaseDate)}</span>}{s.releaseNotes && <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs font-sans text-muted">{s.releaseNotes.replace(/<[^>]+>/g, '')}</pre>}</div>}
            {s.state === 'downloading' && <div><div className="flex justify-between text-xs"><span>جارٍ التنزيل… {s.percent}%</span><span dir="ltr">{formatSize(s.transferred)} / {formatSize(s.total)}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-primary-soft"><div className="h-full bg-teal transition-all" style={{ width: `${s.percent}%` }} /></div></div>}
            {s.state === 'downloaded' && <span className="flex items-center gap-2 text-teal"><CheckCircle2 size={16} /> الإصدار {s.version} جاهز للتثبيت.</span>}
            {s.state === 'error' && <span className="flex items-center gap-2 text-danger"><ShieldAlert size={16} /> {s.message}</span>}
          </div>

          <div className="mt-3 flex gap-2">
            {(s.state === 'idle' || s.state === 'not-available' || s.state === 'error' || s.state === 'dev') && <Button variant="teal" onClick={check}><RefreshCw size={15} /> التحقق من التحديثات</Button>}
            {s.state === 'available' && <Button variant="teal" onClick={() => api.update.download()}><Download size={15} /> تنزيل التحديث</Button>}
            {s.state === 'downloaded' && <Button onClick={install}><RotateCw size={15} /> تثبيت وإعادة التشغيل</Button>}
          </div>
        </div>
      </div>
    </Card>
  )
}

function SchoolCard() {
  const school = useSchool()
  const qc = useQueryClient()
  const [form, setForm] = useState(() => ({ name: school.data?.name ?? '', ministryNumber: school.data?.ministryNumber ?? '', stage: school.data?.stage ?? '', gender: school.data?.gender ?? '', principal: school.data?.principal ?? '', coordinator: school.data?.coordinator ?? '' }))
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  const save = async (): Promise<void> => { setSaving(true); try { await api.school.save(form); await qc.invalidateQueries({ queryKey: keys.school }); toast.success('تم حفظ بيانات المدرسة') } catch (e) { toast.error(errorMessage(e)) } finally { setSaving(false) } }
  return (
    <Card className="p-5">
      <h3 className="mb-3 flex items-center gap-2 text-base font-extrabold"><School size={18} className="text-primary" /> بيانات المدرسة</h3>
      <div className="space-y-3">
        <Field label="اسم المدرسة"><input className={inputClass} value={form.name} onChange={set('name')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="الرقم الوزاري"><input className={inputClass} value={form.ministryNumber} onChange={set('ministryNumber')} /></Field>
          <Field label="المرحلة"><select className={inputClass} value={form.stage} onChange={set('stage')}><option value="">—</option><option>ابتدائي</option><option>متوسط</option><option>ثانوي</option><option>مجمع تعليمي</option></select></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="النوع"><select className={inputClass} value={form.gender} onChange={set('gender')}><option value="">—</option><option>بنين</option><option>بنات</option></select></Field>
          <Field label="قائد/ة المدرسة"><input className={inputClass} value={form.principal} onChange={set('principal')} /></Field>
        </div>
        <Field label="منسق/ة التقويم الذاتي"><input className={inputClass} value={form.coordinator} onChange={set('coordinator')} /></Field>
        <Button onClick={save} loading={saving}>حفظ</Button>
      </div>
    </Card>
  )
}

function BackupSettingsCard() {
  const settings = useSettings()
  const qc = useQueryClient()
  const save = async (patch: { autoBackup?: boolean; autoBackupKeep?: number }): Promise<void> => { await api.settings.save(patch); await qc.invalidateQueries({ queryKey: keys.settings }) }
  return (
    <Card className="p-5">
      <h3 className="mb-3 flex items-center gap-2 text-base font-extrabold"><Wrench size={18} className="text-teal" /> النسخ التلقائي</h3>
      <label className="flex items-center justify-between rounded-xl bg-paper px-4 py-3 text-sm font-bold">
        <span>نسخة احتياطية تلقائية يوميًا عند التشغيل</span>
        <input type="checkbox" className="h-5 w-5 accent-teal" checked={settings.data?.autoBackup ?? true} onChange={e => save({ autoBackup: e.target.checked })} />
      </label>
      <Field label="عدد النسخ التلقائية المحتفظ بها" hint="تُحذف الأقدم تلقائيًا. النسخ اليدوية لا تُحذف أبدًا.">
        <input type="number" min={1} max={60} className={inputClass} value={settings.data?.autoBackupKeep ?? 7} onChange={e => save({ autoBackupKeep: Math.max(1, Math.min(60, Number(e.target.value) || 7)) })} />
      </Field>
      <Button variant="outline" size="sm" className="mt-3" onClick={() => api.app.openDataDir()}><FolderOpen size={14} /> فتح مجلد البيانات</Button>
    </Card>
  )
}

function PinCard() {
  const settings = useSettings()
  const qc = useQueryClient()
  const { prompt } = useDialogs()
  const enabled = settings.data?.pinEnabled
  const setPin = async (): Promise<void> => {
    const pin = await prompt({ title: 'ضبط رمز القفل', label: 'رمز من 4 إلى 8 أرقام يُطلب عند فتح البرنامج', validate: v => (/^\d{4,8}$/.test(v) ? null : 'أدخل 4 إلى 8 أرقام') })
    if (!pin) return
    const again = await prompt({ title: 'تأكيد الرمز', label: 'أعد كتابة الرمز', validate: v => (v === pin ? null : 'الرمزان غير متطابقين') })
    if (!again) return
    await api.pin.set(pin); await qc.invalidateQueries({ queryKey: keys.settings }); toast.success('تم ضبط رمز القفل')
  }
  const clearPin = async (): Promise<void> => {
    const pin = await prompt({ title: 'إزالة رمز القفل', label: 'أدخل الرمز الحالي' })
    if (!pin) return
    if (await api.pin.clear(pin)) { await qc.invalidateQueries({ queryKey: keys.settings }); toast.success('أُزيل رمز القفل') } else toast.error('رمز غير صحيح')
  }
  return (
    <Card className="p-5">
      <h3 className="mb-3 flex items-center gap-2 text-base font-extrabold"><LockKeyhole size={18} className="text-primary" /> رمز القفل</h3>
      <p className="text-sm leading-7 text-muted">يمنع فتح البرنامج على هذا الجهاز دون الرمز. {enabled ? <b className="text-success">مفعّل.</b> : <b>غير مفعّل.</b>}</p>
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" size="sm" onClick={setPin}>{enabled ? 'تغيير الرمز' : 'تفعيل الرمز'}</Button>
        {enabled && <Button variant="danger" size="sm" onClick={clearPin}>إزالة الرمز</Button>}
      </div>
    </Card>
  )
}

function ExcludedCard() {
  const progress = useProgress()
  const items = (progress.data?.domains ?? []).flatMap(d => d.criteria.flatMap(c => c.indicators.flatMap(i => i.witnesses.filter(w => w.excluded).map(w => ({ code: i.code, text: i.text, w })))))
  const restore = async (code: string, name: string): Promise<void> => { try { await api.witness.include({ indicatorCode: code, originalName: name }); toast.success('أُعيد تفعيل الشاهد') } catch (e) { toast.error(errorMessage(e)) } }
  return (
    <Card className="col-span-2 p-5">
      <h3 className="mb-1 flex items-center gap-2 text-base font-extrabold"><EyeOff size={18} className="text-warn" /> الشواهد المستبعدة («لا ينطبق») <span className="rounded-full bg-warn-soft px-2 text-xs text-warn">{items.length}</span></h3>
      <p className="mb-3 text-sm leading-7 text-muted">شواهد قررت المدرسة أنها لا تنطبق عليها؛ لا تُحسب في نسبة الإنجاز وتظهر في التقرير بعلامة «لا ينطبق». تُستبعد من صفحة «المجالات والمعايير» بزر <EyeOff size={12} className="inline" /> بجوار الشاهد.</p>
      {items.length === 0 ? <p className="text-sm text-muted">لا توجد شواهد مستبعدة.</p> : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {items.map(({ code, text, w }) => (
            <li key={`${code}-${w.name}`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <code className="rounded-md bg-blue-soft px-1.5 text-[11px] font-bold text-blue">{code}</code>
              <div className="min-w-0 flex-1"><div className="truncate font-bold">{w.displayName}</div><div className="truncate text-[11px] text-muted">{text}{w.excludeReason ? ` · السبب: ${w.excludeReason}` : ''}</div></div>
              <Button size="sm" variant="outline" onClick={() => restore(code, w.name)}><Eye size={13} /> تفعيل</Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function MaintenanceCard() {
  const info = useAppInfo()
  const [result, setResult] = useState<{ missing: number; orphans: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const run = async (): Promise<void> => { setBusy(true); try { const r = await api.evidence.integrity(); setResult({ missing: r.missing.length, orphans: r.orphanFiles.length }); if (!r.missing.length && !r.orphanFiles.length) toast.success('الملفات سليمة ومطابقة للسجلات') } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) } }
  return (
    <Card className="col-span-2 p-5">
      <h3 className="mb-2 flex items-center gap-2 text-base font-extrabold"><ShieldAlert size={18} className="text-warn" /> فحص سلامة البيانات</h3>
      <p className="text-sm leading-7 text-muted">يتحقق من أن كل ملف مسجل موجود فعلًا على القرص. مجلد البيانات: <code dir="ltr" className="rounded bg-paper px-1.5 text-xs">{info.data?.dataDir}</code> · مخطط القاعدة v{info.data?.schemaVersion}</p>
      <div className="mt-3 flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={run} loading={busy}>فحص الآن</Button>
        {result && <span className="text-sm">{result.missing ? <b className="text-danger">{result.missing} ملف مفقود من القرص</b> : <b className="text-success">لا ملفات مفقودة</b>}{result.orphans ? <span className="text-muted"> · {result.orphans} ملف في المجلد غير مسجل</span> : null}</span>}
      </div>
    </Card>
  )
}
