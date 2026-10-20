import { AlertTriangle, ArrowLeft, BookOpen, Clock, Database, EyeOff, Eye, FileCheck2, FileText, FileWarning, FolderOpen, HardDrive, Layers3, Printer, ShieldCheck, Upload } from 'lucide-react'
import type { NavTarget } from '@/app/navigation'
import { useActivity, useProgress, useSchool, useSettings } from '@/lib/queries'
import { Card, EmptyState, Pill, SectionHeading, StatCard, domainStatus } from '@/components/ui/Card'
import { Button, IconButton } from '@/components/ui/Button'
import { formatDate, formatSize, fileKind } from '@/lib/format'
import { domainDescriptions } from '@shared/evaluationData'
import { useState } from 'react'
import { PreviewDialog } from '@/features/evidence/PreviewDialog'
import { AnalyticsSection } from '@/features/charts/AnalyticsSection'

const actionLabels: Record<string, string> = {
  'evidence.add': 'رفع شاهد', 'evidence.remove': 'حذف ملف', 'evidence.restore': 'استعادة ملف', 'evidence.removeWitness': 'حذف ملفات شاهد',
  'witness.addCustom': 'إضافة شاهد مخصص', 'witness.exclude': 'استبعاد (لا ينطبق)', 'witness.include': 'إعادة تفعيل', 'witness.removeCustom': 'حذف شاهد مخصص', 'school.save': 'تحديث بيانات المدرسة',
  'backup.create': 'نسخة احتياطية', 'backup.export': 'تصدير نسخة', 'backup.restore': 'استعادة نسخة', 'report.pdf': 'تصدير تقرير PDF', 'pin.set': 'ضبط رمز القفل', 'pin.clear': 'إزالة رمز القفل'
}
const kindBadge: Record<ReturnType<typeof fileKind>, { label: string; cls: string }> = {
  pdf: { label: 'PDF', cls: 'bg-danger-soft text-danger' }, word: { label: 'DOC', cls: 'bg-blue-soft text-blue' }, excel: { label: 'XLS', cls: 'bg-success-soft text-success' },
  ppt: { label: 'PPT', cls: 'bg-warn-soft text-warn' }, image: { label: 'IMG', cls: 'bg-mint text-[#0b6f6b]' }, archive: { label: 'ZIP', cls: 'bg-paper text-muted' }, other: { label: 'FILE', cls: 'bg-paper text-muted' }
}

export function DashboardPage({ onNavigate }: { onNavigate: (t: NavTarget) => void }) {
  const school = useSchool()
  const progress = useProgress()
  const activity = useActivity()
  const settings = useSettings()
  const [preview, setPreview] = useState<{ id: number; name: string } | null>(null)
  const p = progress.data
  const missingCount = (p?.total ?? 0) - (p?.completed ?? 0)
  const excludedCount = p?.domains.flatMap(d => d.criteria).flatMap(c => c.indicators).flatMap(i => i.witnesses).filter(w => w.excluded).length ?? 0
  const allFiles = (p?.domains ?? []).flatMap(d => d.criteria.flatMap(c => c.indicators.flatMap(i => i.witnesses.flatMap(w => w.files.map(f => ({ f, i, w, d }))))))
  const recent = allFiles.sort((a, b) => b.f.createdAt.localeCompare(a.f.createdAt)).slice(0, 6)

  return (
    <>
      <SectionHeading eyebrow={`✓ دليل التقويم المدرسي · ${school.data?.name ?? ''}`} title="الرئيسية والإحصائيات"
        description="نظام إدارة وأرشفة وثائق التقويم المدرسي محليًا — 4 مجالات، 11 معيارًا، 52 مؤشرًا، و162 شاهدًا معتمدًا طبقًا للدليل الإجرائي."
        action={<>
          <Button variant="outline" onClick={() => onNavigate({ page: 'report' })}><Printer size={15} /> تصدير التقرير الفوري (PDF)</Button>
          <Button onClick={() => onNavigate({ page: 'standards' })}><Upload size={15} /> رفع وثائق جديدة</Button>
        </>} />

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={<FileText size={18} />} label="إجمالي الشواهد المطلوبة" value={p?.total ?? 0} sub="شاهد · مستهدف 100%" tone="primary" percent={100} />
        <StatCard icon={<FileCheck2 size={18} />} label="الشواهد المكتملة والمؤرشفة" value={p?.completed ?? 0} sub={<Pill tone="mint">{p?.percent ?? 0}% مكتمل</Pill>} tone="teal" percent={p?.percent ?? 0} />
        <StatCard icon={<FileWarning size={18} />} label="الشواهد الناقصة" value={missingCount} sub={<Pill tone="danger">{p?.total ? Math.round((missingCount / p.total) * 100) : 0}% متأخر</Pill>} tone="danger" percent={p?.total ? (missingCount / p.total) * 100 : 0} />
        <StatCard icon={<EyeOff size={18} />} label="شواهد مستثناة رسميًا" value={excludedCount} sub="بمحضر معتمد · لا ينطبق" tone="muted" percent={p ? (excludedCount / (p.total + excludedCount || 1)) * 100 : 0} />
      </div>

      <div className="mt-7 mb-3">
        <h2 className="text-xl font-extrabold text-ink">المجالات الرئيسية الأربعة للتقويم المدرسي</h2>
        <p className="text-sm text-muted">توزيع نسب الإنجاز حسب تصنيف هيئة تقويم التعليم والتدريب للعام الحالي.</p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {p?.domains.map(d => {
          const pct = d.total ? Math.round((d.completed / d.total) * 100) : 0
          const status = domainStatus(pct)
          const activeIndicators = d.criteria.reduce((s, c) => s + c.indicators.filter(i => !i.notApplicable).length, 0)
          return (
            <Card key={d.id} className="flex flex-col overflow-hidden">
              <div className="h-1.5 w-full" style={{ background: d.id === 1 ? '#4b20b8' : d.id === 2 ? '#7139db' : d.id === 3 ? '#08aaa5' : '#5fd3cf' }} />
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center justify-between"><Pill tone={status.tone}>{status.label}</Pill><span className="font-mono text-[11px] font-bold text-muted">DOM-0{d.id}</span></div>
                <h3 className="mt-3 text-[15px] font-extrabold text-ink">{d.icon} مجال {d.name}</h3>
                <p className="mt-1 line-clamp-2 text-[11.5px] leading-5 text-muted">{domainDescriptions[d.id]}</p>
                <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-[11.5px]">
                  <div className="flex justify-between"><dt className="text-muted">المعايير المعتمدة</dt><dd className="font-bold">{d.criteria.length} معايير</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">المؤشرات التفصيلية</dt><dd className="font-bold">{activeIndicators} مؤشرًا</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">الشواهد الرقمية</dt><dd className="font-bold">{d.completed} من {d.total} شاهد</dd></div>
                </dl>
                <div className="mt-3 flex items-center justify-between text-[11.5px]"><span className="text-muted">نسبة الإنجاز</span><span className="text-sm font-extrabold text-ink">{pct}%</span></div>
                <div className="stat-line mt-1"><i style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#08aaa5,#4b20b8)' }} /></div>
                <button onClick={() => onNavigate({ page: 'standards', domainId: d.id })} className="mt-3 flex items-center justify-center gap-1 rounded-xl border border-primary-line py-2 text-[12.5px] font-bold text-primary hover:bg-lavender">استعراض المؤشرات ({activeIndicators}) <ArrowLeft size={14} /></button>
              </div>
            </Card>
          )
        })}
      </div>

      {p && <AnalyticsSection p={p} />}

      <div className="mt-5 grid grid-cols-[1fr_300px] gap-4">
        {/* آخر الوثائق */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div><h3 className="flex items-center gap-2 text-base font-extrabold"><FileText size={17} className="text-primary" /> أحدث وثائق الشواهد المرفوعة محليًا</h3><p className="text-[11.5px] text-muted">سجل التدقيق الحي للملفات المعتمدة على القرص الداخلي للمدرسة</p></div>
          </div>
          {recent.length === 0 ? (
            <EmptyState icon={<Upload size={22} />} title="لم تُرفع أي وثيقة بعد" description="ابدأ من «المجالات والمعايير» واختر المؤشر ثم ارفع الشاهد." action={<Button variant="teal" onClick={() => onNavigate({ page: 'standards' })}>رفع أول شاهد</Button>} />
          ) : (
            <table className="w-full text-[12.5px]">
              <thead><tr className="border-b border-line text-right text-[11px] text-muted"><th className="py-2 font-bold">رمز المؤشر</th><th className="py-2 font-bold">عنوان الشاهد والوثيقة</th><th className="py-2 font-bold">النوع والحجم</th><th className="py-2 font-bold">تاريخ الحفظ</th><th className="py-2 font-bold">الحالة</th><th className="py-2 font-bold">إجراء</th></tr></thead>
              <tbody>
                {recent.map(({ f, i, w }) => (
                  <tr key={f.id} className="border-b border-line/70 last:border-0">
                    <td className="py-2.5"><button onClick={() => onNavigate({ page: 'standards', domainId: Number(i.code.replace('(', '')[0]), indicatorCode: i.code })}><Pill tone="mint" className="font-mono">{i.displayCode.replace(/[()]/g, '')}</Pill></button></td>
                    <td className="py-2.5"><div className="font-bold text-ink">{w.displayName}</div><div className="truncate text-[11px] text-muted" title={f.fileName}>{f.fileName}</div></td>
                    <td className="py-2.5"><span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-extrabold ${kindBadge[fileKind(f.fileName)].cls}`}>{kindBadge[fileKind(f.fileName)].label}</span> <span className="text-muted">{formatSize(f.fileSize)}</span></td>
                    <td className="py-2.5 text-muted">{formatDate(f.createdAt)}</td>
                    <td className="py-2.5"><Pill tone="mint"><FileCheck2 size={11} /> محفوظ محليًا</Pill></td>
                    <td className="py-2.5"><div className="flex"><IconButton title="معاينة" onClick={() => setPreview({ id: f.id, name: f.fileName })}><Eye size={15} /></IconButton><IconButton title="إظهار في المجلد" onClick={() => window.api.evidence.showInFolder(f.id)}><FolderOpen size={15} /></IconButton></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <div className="space-y-4">
          {/* الوثائق الناقصة */}
          <Card className="border-danger/20 p-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-danger"><AlertTriangle size={15} /> متطلبات عاجلة</h3>
              <Pill tone="danger">{p?.missing.length ?? 0} ناقصة</Pill>
            </div>
            {p && p.missing.length === 0 ? <p className="mt-2 text-xs text-muted">اكتمل الملف — كل الوثائق المطلوبة مرفوعة.</p> : (
              <ul className="mt-2 divide-y divide-line">
                {p?.missing.slice(0, 5).map((m, k) => (
                  <li key={`${m.indicatorCode}-${m.witnessName}-${k}`}>
                    <button onClick={() => onNavigate({ page: 'standards', domainId: m.domainId, indicatorCode: m.indicatorCode })} className="group flex w-full items-center gap-2 py-2 text-right">
                      <span className="rounded-md bg-danger-soft px-1.5 font-mono text-[10px] font-bold text-danger">{m.displayCode.replace(/[()]/g, '')}</span>
                      <span className="flex-1 truncate text-xs font-semibold group-hover:text-primary">{m.witnessName}</span>
                      <ArrowLeft size={13} className="text-muted opacity-0 group-hover:opacity-100" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {p && p.missing.length > 5 && <button onClick={() => onNavigate({ page: 'report' })} className="mt-1 text-[11.5px] font-bold text-danger hover:underline">استعراض المؤشرات المطلوبة فورًا ←</button>}
          </Card>

          {/* النسخ الاحتياطي */}
          <Card className="p-4">
            <h3 className="flex items-center gap-2 text-sm font-extrabold"><ShieldCheck size={15} className="text-teal" /> النسخ الاحتياطي التلقائي</h3>
            <p className="mt-1 text-[11.5px] leading-6 text-muted">{settings.data?.autoBackup ? 'مفعّل يوميًا' : 'متوقف'} · آخر نسخة: <b className="text-ink">{formatDate(settings.data?.lastAutoBackupAt)}</b></p>
            <p className="flex items-center gap-1 text-[11.5px] text-muted"><HardDrive size={12} /> حجم الشواهد على القرص: <b className="text-ink">{formatSize(allFiles.reduce((s, x) => s + x.f.fileSize, 0))}</b></p>
            <Button variant="secondary" size="sm" className="mt-2" onClick={() => onNavigate({ page: 'backup' })}><Database size={13} /> إدارة النسخ</Button>
          </Card>

          {/* روابط سريعة */}
          <Card className="p-4">
            <h3 className="text-sm font-extrabold">أدلة ونماذج استرشادية</h3>
            <ul className="mt-2 space-y-1.5 text-[12px] font-bold">
              <li><button onClick={() => onNavigate({ page: 'about' })} className="flex w-full items-center gap-2 rounded-lg bg-paper px-3 py-2 text-ink hover:bg-lavender"><BookOpen size={13} className="text-primary" /> الدليل الإجرائي والأهداف والمتطلبات</button></li>
              <li><button onClick={() => onNavigate({ page: 'report' })} className="flex w-full items-center gap-2 rounded-lg bg-paper px-3 py-2 text-ink hover:bg-lavender"><Layers3 size={13} className="text-primary" /> قائمة الشواهد الـ{(p?.total ?? 0) + excludedCount} مع المتطلبات</button></li>
              <li><button onClick={() => window.api.app.openDataDir()} className="flex w-full items-center gap-2 rounded-lg bg-paper px-3 py-2 text-ink hover:bg-lavender"><FolderOpen size={13} className="text-primary" /> فتح مجلد البيانات على الجهاز</button></li>
            </ul>
          </Card>

          <Card className="p-4">
            <h3 className="flex items-center gap-2 text-sm font-extrabold"><Clock size={15} className="text-primary" /> آخر النشاطات</h3>
            <ul className="mt-2 space-y-1.5">
              {activity.data?.slice(0, 4).map(a => <li key={a.id} className="text-[11.5px]"><b className="text-ink">{actionLabels[a.action] ?? a.action}</b>{a.details && <span className="text-muted"> — {a.details}</span>}<div className="text-[10px] text-muted/80">{formatDate(a.createdAt)}</div></li>)}
              {activity.data?.length === 0 && <li className="text-xs text-muted">لا توجد نشاطات بعد.</li>}
            </ul>
          </Card>
        </div>
      </div>
      <PreviewDialog fileId={preview?.id ?? null} fileName={preview?.name ?? ''} onClose={() => setPreview(null)} />
    </>
  )
}
