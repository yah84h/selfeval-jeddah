import { useState } from 'react'
import { FileDown, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { useAppInfo, useProgress, useSchool } from '@/lib/queries'
import { api, errorMessage } from '@/lib/api'
import { Card, ProgressRing, SectionHeading, Stat } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { buildReportHtml } from '@/features/report/buildReportHtml'
import { formatDateOnly } from '@/lib/format'

export function ReportPage() {
  const progress = useProgress()
  const school = useSchool()
  const info = useAppInfo()
  const [exporting, setExporting] = useState(false)
  const [filter, setFilter] = useState<'all' | 'missing'>('all')
  const p = progress.data

  const exportPdf = async (): Promise<void> => {
    if (!p) return
    setExporting(true)
    try {
      const path = await api.report.exportPdf(buildReportHtml(p, school.data ?? null, info.data?.version ?? ''))
      if (path) toast.success('تم حفظ التقرير PDF', { description: path })
    } catch (e) { toast.error(errorMessage(e)) } finally { setExporting(false) }
  }

  if (!p) return null
  return (
    <>
      <div className="no-print">
        <SectionHeading eyebrow="متابعة الإنجاز" title="لوحة قياس التقدم والإنجاز" description="تفصيل كل مجال ومعيار ومؤشر ووثيقة في ملف مدرستك."
          action={<>
            <div className="flex rounded-xl border border-line bg-white p-0.5 text-xs font-bold">
              <button onClick={() => setFilter('all')} className={`rounded-lg px-3 py-1.5 ${filter === 'all' ? 'bg-primary text-white' : 'text-muted'}`}>الكل</button>
              <button onClick={() => setFilter('missing')} className={`rounded-lg px-3 py-1.5 ${filter === 'missing' ? 'bg-danger text-white' : 'text-muted'}`}>الناقص فقط</button>
            </div>
            <Button variant="outline" onClick={() => window.print()}><Printer size={15} /> طباعة</Button>
            <Button onClick={exportPdf} loading={exporting}><FileDown size={15} /> حفظ PDF</Button>
          </>} />
      </div>

      <div className="print-area">
        <div className="mb-5 hidden border-b-2 border-primary pb-3 print:block">
          <h1 className="text-xl font-extrabold text-primary">تقرير إنجاز التقويم الذاتي المدرسي</h1>
          <p className="text-xs text-muted">{school.data?.name} · {formatDateOnly(new Date().toISOString())}</p>
        </div>

        <Card className="mb-5 flex items-center gap-6 p-6 print:border-0 print:shadow-none">
          <ProgressRing percent={p.percent} size={128} />
          <div className="grid flex-1 grid-cols-4 gap-3">
            <Stat label="وثائق مكتملة" value={p.completed} tone="teal" />
            <Stat label="وثائق ناقصة" value={p.total - p.completed} tone="danger" />
            <Stat label="إجمالي الوثائق" value={p.total} />
            <Stat label="ملفات مرفوعة" value={p.uploadedFiles} tone="primary" />
          </div>
        </Card>

        <div className="space-y-4">
          {p.domains.map(d => (
            <Card key={d.id} className="report-domain overflow-hidden print:border-0 print:shadow-none">
              <div className="flex items-center gap-3 bg-primary-soft px-5 py-3">
                <span className="text-2xl">{d.icon}</span>
                <h2 className="flex-1 text-base font-extrabold text-primary">المجال {d.id}: {d.name}</h2>
                <span className="text-xs font-bold text-muted">{d.completed}/{d.total} · {d.total ? Math.round((d.completed / d.total) * 100) : 0}%</span>
              </div>
              <div className="px-5 py-2">
                {d.criteria.map(c => {
                  const indicators = filter === 'missing' ? c.indicators.filter(i => i.completed < i.total) : c.indicators
                  if (!indicators.length) return null
                  return (
                    <div key={c.id} className="py-2">
                      <h3 className="mb-1 flex items-center justify-between border-b border-line pb-1 text-sm font-extrabold text-teal"><span>{c.id} — {c.name}</span><span className="text-xs text-muted">{c.completed}/{c.total}</span></h3>
                      {indicators.map(i => (
                        <div key={i.code} className="py-1.5">
                          <div className="flex items-start gap-2 text-sm font-bold"><code className="rounded-md bg-blue-soft px-1.5 text-[11px] text-blue">{i.code}</code><span className="flex-1 leading-6">{i.text}</span><b className="text-xs text-muted">{i.completed}/{i.total}</b></div>
                          <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 pr-6">
                            {i.witnesses.filter(w => filter === 'all' || !w.complete).map(w => (
                              <li key={w.name} className="flex items-center gap-2 text-xs">
                                <i className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-extrabold not-italic ${w.complete ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>{w.complete ? '✓' : '!'}</i>
                                <span className="flex-1 truncate">{w.displayName}{w.isCustom && <span className="text-primary"> (مخصص)</span>}</span>
                                <span className="text-[10px] text-muted">{w.complete ? `${w.files.length} ملف` : 'ناقص'}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  )
}
