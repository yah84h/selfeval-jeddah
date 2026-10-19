import { ArrowLeft, Clock, Database, FileWarning, Layers3, Upload } from 'lucide-react'
import type { NavTarget } from '@/app/navigation'
import { useActivity, useProgress, useSchool, useSettings } from '@/lib/queries'
import { Card, EmptyState, ProgressRing, SectionHeading, Stat } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/format'

const actionLabels: Record<string, string> = {
  'evidence.add': 'رفع شاهد', 'evidence.remove': 'حذف ملف', 'evidence.restore': 'استعادة ملف', 'evidence.removeWitness': 'حذف ملفات شاهد',
  'witness.addCustom': 'إضافة شاهد مخصص', 'witness.removeCustom': 'حذف شاهد مخصص', 'school.save': 'تحديث بيانات المدرسة',
  'backup.create': 'نسخة احتياطية', 'backup.export': 'تصدير نسخة', 'backup.restore': 'استعادة نسخة', 'report.pdf': 'تصدير تقرير PDF', 'pin.set': 'ضبط رمز القفل', 'pin.clear': 'إزالة رمز القفل'
}

export function DashboardPage({ onNavigate }: { onNavigate: (t: NavTarget) => void }) {
  const school = useSchool()
  const progress = useProgress()
  const activity = useActivity()
  const settings = useSettings()
  const p = progress.data

  return (
    <>
      <SectionHeading eyebrow="لوحة التحكم" title={`مرحبًا، ${school.data?.name ?? ''}`} description="متابعة شاملة لإنجاز ملف التقويم الذاتي على هذا الجهاز."
        action={<Button variant="teal" onClick={() => onNavigate({ page: 'standards' })}><Upload size={16} /> رفع الشواهد</Button>} />

      <div className="grid grid-cols-[auto_1fr] gap-5">
        <Card className="flex items-center gap-6 p-6">
          <ProgressRing percent={p?.percent ?? 0} />
          <div className="grid grid-cols-2 gap-3">
            <Stat label="وثائق مكتملة" value={p?.completed ?? 0} tone="teal" />
            <Stat label="إجمالي الوثائق" value={p?.total ?? 0} />
            <Stat label="ملفات مرفوعة" value={p?.uploadedFiles ?? 0} tone="primary" />
            <Stat label="وثائق ناقصة" value={(p?.total ?? 0) - (p?.completed ?? 0)} tone="danger" />
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold"><Layers3 size={16} className="text-primary" /> الإنجاز حسب المجال</h3>
          <div className="space-y-3">
            {p?.domains.map(d => {
              const pct = d.total ? Math.round((d.completed / d.total) * 100) : 0
              return (
                <button key={d.id} onClick={() => onNavigate({ page: 'standards', domainId: d.id })} className="group block w-full text-right">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-bold group-hover:text-primary">{d.icon} المجال {d.id}: {d.name}</span>
                    <span className="text-xs font-bold text-muted">{d.completed}/{d.total} · <span className="text-teal">{pct}%</span></span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-primary-soft"><div className="h-full rounded-full bg-gradient-to-l from-primary to-teal transition-all" style={{ width: `${pct}%` }} /></div>
                </button>
              )
            })}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-[1.4fr_1fr] gap-5">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-extrabold"><FileWarning size={16} className="text-danger" /> أهم الوثائق الناقصة</h3>
            <span className="text-xs text-muted">{p?.missing.length ?? 0} ناقصة</span>
          </div>
          {p && p.missing.length === 0 ? (
            <EmptyState icon={<Layers3 size={22} />} title="اكتمل الملف" description="كل الوثائق المطلوبة مرفوعة." />
          ) : (
            <ul className="divide-y divide-line">
              {p?.missing.slice(0, 8).map((m, i) => (
                <li key={`${m.indicatorCode}-${m.witnessName}-${i}`}>
                  <button onClick={() => onNavigate({ page: 'standards', domainId: m.domainId, indicatorCode: m.indicatorCode })} className="group flex w-full items-center gap-3 py-2.5 text-right">
                    <code className="rounded-md bg-blue-soft px-2 py-0.5 text-[11px] font-bold text-blue">{m.indicatorCode}</code>
                    <span className="flex-1 truncate text-sm font-semibold group-hover:text-primary">{m.witnessName}</span>
                    <ArrowLeft size={15} className="text-muted opacity-0 transition group-hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {p && p.missing.length > 8 && <Button variant="ghost" size="sm" className="mt-2" onClick={() => onNavigate({ page: 'report' })}>عرض التقرير الكامل</Button>}
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold"><Database size={16} className="text-teal" /> الحماية</h3>
            <p className="text-xs leading-6 text-muted">
              النسخ التلقائي: <b className="text-ink">{settings.data?.autoBackup ? 'مفعّل (يومي)' : 'متوقف'}</b><br />
              آخر نسخة تلقائية: <b className="text-ink">{formatDate(settings.data?.lastAutoBackupAt)}</b>
            </p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => onNavigate({ page: 'backup' })}>إدارة النسخ الاحتياطي</Button>
          </Card>
          <Card className="p-5">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold"><Clock size={16} className="text-primary" /> آخر النشاطات</h3>
            <ul className="space-y-2">
              {activity.data?.slice(0, 6).map(a => (
                <li key={a.id} className="text-xs">
                  <span className="font-bold text-ink">{actionLabels[a.action] ?? a.action}</span>
                  {a.details && <span className="text-muted"> — {a.details}</span>}
                  <div className="text-[10px] text-muted/80">{formatDate(a.createdAt)}</div>
                </li>
              ))}
              {activity.data?.length === 0 && <li className="text-xs text-muted">لا توجد نشاطات بعد.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  )
}
