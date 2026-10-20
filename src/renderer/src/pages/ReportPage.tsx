import { useMemo, useState } from 'react'
import { CheckCircle2, FileDown, Printer, ShieldCheck, Settings2, ListChecks } from 'lucide-react'
import { toast } from 'sonner'
import { useAppInfo, useProgress, useSchool } from '@/lib/queries'
import { api, errorMessage } from '@/lib/api'
import { Card, Pill, ProgressRing, SectionHeading, inputClass } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { buildReportHtml } from '@/features/report/buildReportHtml'
import { buildEvidenceLog, defaultReportOptions, gregDate, hijriDate, readinessLabel, reportRef, type ReportOptions } from '@/features/report/reportModel'
import { formatDateOnly, formatSize } from '@/lib/format'
import { Logo } from '@/components/Logo'

export function ReportPage() {
  const progress = useProgress()
  const school = useSchool()
  const info = useAppInfo()
  const [exporting, setExporting] = useState(false)
  const [opt, setOpt] = useState<ReportOptions>(defaultReportOptions)
  const p = progress.data
  const log = useMemo(() => (p ? buildEvidenceLog(p) : []), [p])

  const exportPdf = async (): Promise<void> => {
    if (!p) return
    setExporting(true)
    try {
      const path = await api.report.exportPdf(buildReportHtml(p, school.data ?? null, info.data?.version ?? '', opt))
      if (path) toast.success('تم حفظ التقرير PDF', { description: path })
    } catch (e) { toast.error(errorMessage(e)) } finally { setExporting(false) }
  }

  if (!p) return null
  const s = school.data
  const set = <K extends keyof ReportOptions>(k: K, v: ReportOptions[K]): void => setOpt(o => ({ ...o, [k]: v }))

  return (
    <>
      <div className="no-print">
        <SectionHeading eyebrow="● التقارير الرسمية والاعتماد المدرسي" title="تقرير الإنجاز الشامل ومطابقة الشواهد"
          description="توليد وطباعة تقرير الإنجاز المعتمد لتقديمه لفرق التقويم الخارجي والإدارة العامة للتعليم بجدة، ومتابعة مطابقة الأدلة الشاملة."
          action={<>
            <Button variant="outline" onClick={() => window.print()}><Printer size={15} /> طباعة التقرير الفوري</Button>
            <Button onClick={exportPdf} loading={exporting}><FileDown size={15} /> تصدير PDF عالي الدقة</Button>
          </>} />

        <Card className="mb-4 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold"><Settings2 size={15} className="text-primary" /> خيارات ومعايير تضمين التقرير المطبوع</h3>
          <div className="grid grid-cols-3 gap-3">
            <label className="text-[11.5px] font-bold text-muted">نطاق المؤشرات<select className={`${inputClass} mt-1 h-10`} value={opt.scope} onChange={e => set('scope', e.target.value as ReportOptions['scope'])}><option value="all">كافة المجالات الأربعة (11 معيارًا)</option><option value="missing">الشواهد الناقصة فقط</option></select></label>
            <div className="text-[11.5px] font-bold text-muted">مستوى التفصيل<div className="mt-1 flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-xs font-bold text-ink">{log.length} وثيقة في سجل المطابقة · {p.total} شاهدًا</div></div>
            <div className="text-[11.5px] font-bold text-muted">المرجع<div className="mt-1 flex h-10 items-center rounded-xl border border-line bg-white px-3 font-mono text-xs font-bold text-ink" dir="ltr">{reportRef(s ?? null)}</div></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[12px] font-bold">
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-primary" checked={opt.includeFileNames} onChange={e => set('includeFileNames', e.target.checked)} /> تضمين أسماء الملفات المحلية للشواهد</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-primary" checked={opt.showExcludedReasons} onChange={e => set('showExcludedReasons', e.target.checked)} /> إظهار تبريرات الشواهد المعفاة (لا ينطبق)</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-primary" checked={opt.includeEvidenceLog} onChange={e => set('includeEvidenceLog', e.target.checked)} /> إدراج سجل مطابقة الشواهد</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-primary" checked={opt.includeSignatures} onChange={e => set('includeSignatures', e.target.checked)} /> إدراج حقول الاعتماد والتوقيع</label>
          </div>
        </Card>
      </div>

      {/* الوثيقة */}
      <div className="print-area overflow-hidden rounded-2xl border border-line bg-white shadow-card print:rounded-none print:border-0 print:shadow-none">
        <div className="h-2 bg-gradient-to-l from-primary via-[#7139db] to-teal print:hidden" />
        <div className="px-8 py-6">
          {/* الترويسة */}
          <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
            <div className="text-[11px] leading-5 text-muted">
              <div className="font-extrabold text-ink">المملكة العربية السعودية</div>
              <div>وزارة التعليم</div><div>الإدارة العامة للتعليم بمحافظة جدة</div><div>إدارة الجودة والاعتماد المدرسي</div>
            </div>
            <div className="text-center">
              <div className="mx-auto w-fit"><Logo size={56} /></div>
              <h1 className="mt-2 text-lg font-extrabold text-primary">تقرير جاهزية وشواهد التقويم المدرسي</h1>
              <p className="text-[11px] text-muted">مطابق لمعايير هيئة تقويم التعليم والتدريب (الإصدار المحلي v{info.data?.version})</p>
            </div>
            <div className="text-[11px] leading-5 text-muted" dir="ltr">
              <div><b className="text-ink">REF:</b> <span className="font-mono">{reportRef(s ?? null)}</span></div>
              <div><b className="text-ink">Date:</b> {gregDate()}</div>
              <div dir="rtl"><b className="text-ink">التاريخ الهجري:</b> {hijriDate()}</div>
              <div className="flex items-center gap-1 text-success"><ShieldCheck size={11} /> Verified Local Copy</div>
            </div>
          </div>

          {/* بيانات المنشأة */}
          <div className="mt-4 grid grid-cols-4 gap-3 rounded-xl bg-paper p-3 text-[11.5px]">
            <div><div className="text-muted">اسم المنشأة التعليمية</div><div className="font-extrabold text-ink">{s?.name}</div></div>
            <div><div className="text-muted">الرقم الوزاري المعتمد</div><div className="font-mono font-extrabold text-ink">{s?.ministryNumber || '—'}</div></div>
            <div><div className="text-muted">المرحلة ونوع التعليم</div><div className="font-extrabold text-ink">{[s?.stage, s?.gender].filter(Boolean).join(' - ') || '—'}</div></div>
            <div><div className="text-muted">قائد المدرسة / منسق التقويم</div><div className="font-extrabold text-ink">{[s?.principal, s?.coordinator].filter(Boolean).join(' / ') || '—'}</div></div>
          </div>

          {/* الملخص */}
          <div className="mt-5 grid grid-cols-[260px_1fr] gap-4">
            <Card className="flex flex-col items-center justify-center bg-lavender/40 p-5 print:border print:shadow-none">
              <div className="text-[12px] font-extrabold text-ink">المؤشر العام لاكتمال الشواهد</div>
              <div className="my-3"><ProgressRing percent={p.percent} size={136} label={`${p.completed} من أصل ${p.total}`} /></div>
              <Pill tone="mint"><CheckCircle2 size={11} /> {readinessLabel(p.percent)}</Pill>
            </Card>
            <Card className="p-5 print:border print:shadow-none">
              <h3 className="mb-3 flex items-center justify-between text-sm font-extrabold"><span>التوزيع الإحصائي وفق المجالات الأربعة</span><span className="text-[11px] font-semibold text-muted">المرجع: دليل معايير التقويم المدرسي</span></h3>
              <div className="space-y-3">
                {p.domains.map(d => {
                  const pct = d.total ? Math.round((d.completed / d.total) * 100) : 0
                  const naCount = d.criteria.reduce((sum, c) => sum + c.indicators.filter(i => i.notApplicable).length, 0)
                  return (
                    <div key={d.id}>
                      <div className="flex items-center justify-between text-[12px]"><span className="font-bold text-ink">{d.id}. {d.name}</span><span className="text-muted">{d.completed}/{d.total} منجز <b className="text-primary">{pct}%</b></span></div>
                      <div className="stat-line mt-1"><i style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#08aaa5,#4b20b8)' }} /></div>
                      <div className="mt-0.5 text-[10.5px] text-muted">المتبقي: {d.total - d.completed} شاهد{naCount ? ` · ${naCount} مؤشر لا ينطبق` : ''}</div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* التفصيل */}
          <div className="mt-6">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold"><ListChecks size={15} className="text-primary" /> تفصيل المعايير والمؤشرات والشواهد</h3>
            {p.domains.map(d => (
              <div key={d.id} className="report-domain mt-3 rounded-xl border border-line">
                <div className="flex items-center justify-between rounded-t-xl bg-lavender/60 px-4 py-2"><b className="text-[13px] text-primary">{d.icon} المجال {d.id}: {d.name}</b><span className="text-[11px] text-muted">{d.completed}/{d.total}</span></div>
                <div className="px-4 py-2">
                  {d.criteria.map(c => {
                    const visible = c.indicators.filter(i => !i.notApplicable)
                    const na = c.indicators.filter(i => i.notApplicable)
                    const indicators = opt.scope === 'missing' ? visible.filter(i => i.completed < i.total) : visible
                    if (!indicators.length && !na.length) return null
                    return (
                      <div key={c.id} className="py-1.5">
                        <div className="flex items-center justify-between border-b border-line pb-1 text-[12.5px] font-extrabold text-teal"><span>{c.id} — {c.name}</span><span className="text-[11px] text-muted">{c.completed}/{c.total}</span></div>
                        {indicators.map(i => (
                          <div key={i.code} className="py-1.5">
                            <div className="flex items-start gap-2 text-[12.5px] font-bold"><span className="rounded-md bg-lavender px-1.5 font-mono text-[10.5px] text-primary">{i.displayCode.replace(/[()]/g, '')}</span><span className="flex-1 leading-5">{i.text}</span><b className="text-[11px] text-muted">{i.completed}/{i.total}</b></div>
                            <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 pr-5">
                              {i.witnesses.filter(w => opt.scope === 'all' || (!w.complete && !w.excluded)).map(w => (
                                <li key={w.name} className={`flex items-center gap-2 text-[11.5px] ${w.excluded ? 'opacity-60' : ''}`}>
                                  <i className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-extrabold not-italic ${w.excluded ? 'bg-warn-soft text-warn' : w.complete ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>{w.excluded ? '–' : w.complete ? '✓' : '!'}</i>
                                  <span className={`flex-1 truncate ${w.excluded ? 'line-through' : ''}`}>{w.displayName}{w.isCustom && <span className="text-primary"> (مخصص)</span>}{opt.includeFileNames && w.files.length > 0 && <span className="text-muted"> — {w.files.map(f => f.fileName).join('، ')}</span>}</span>
                                  <span className="text-[10px] text-muted">{w.excluded ? `لا ينطبق${opt.showExcludedReasons && w.excludeReason ? ` — ${w.excludeReason}` : ''}` : w.complete ? `${w.files.length} ملف` : 'ناقص'}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                        {na.length > 0 && opt.scope === 'all' && <p className="mt-1 text-[10.5px] text-muted">مؤشرات لا تنطبق على المدرسة (مستبعدة): {na.map(i => `${i.code} ${i.text}${opt.showExcludedReasons && i.excludeReason ? ` — ${i.excludeReason}` : ''}`).join(' · ')}</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* سجل المطابقة */}
          {opt.includeEvidenceLog && log.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 flex items-center justify-between text-sm font-extrabold"><span>سجل مطابقة الشواهد والوثائق المرفقة</span><span className="text-[11px] font-semibold text-muted">آخر {log.length} وثيقة من أصل {p.uploadedFiles}</span></h3>
              <table className="w-full text-[11px]">
                <thead><tr className="bg-paper text-right text-muted"><th className="rounded-r-lg px-2 py-2 font-bold">رمز المؤشر</th><th className="px-2 py-2 font-bold">عنوان الشاهد والوثيقة</th><th className="px-2 py-2 font-bold">اسم الملف المحلي</th><th className="px-2 py-2 font-bold">الحجم</th><th className="px-2 py-2 font-bold">تاريخ التوثيق</th><th className="rounded-l-lg px-2 py-2 font-bold">الحالة</th></tr></thead>
                <tbody>{log.map(r => (
                  <tr key={r.file.id} className="border-b border-line/70">
                    <td className="px-2 py-1.5"><span className="font-mono font-bold text-primary">{r.code.replace(/[()]/g, '')}</span><div className="text-[10px] text-muted">معيار {r.criterion}</div></td>
                    <td className="px-2 py-1.5 font-bold text-ink">{r.witness}</td>
                    <td className="px-2 py-1.5 font-mono text-[10px] text-muted" dir="ltr">{r.file.fileName}</td>
                    <td className="px-2 py-1.5 text-muted">{formatSize(r.file.fileSize)}</td>
                    <td className="px-2 py-1.5 text-muted">{formatDateOnly(r.file.createdAt)}</td>
                    <td className="px-2 py-1.5"><Pill tone="mint">مكتمل وموثق</Pill></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {/* الاعتماد */}
          {opt.includeSignatures && (
            <div className="mt-6 rounded-xl border border-line bg-paper/60 p-4">
              <h3 className="text-sm font-extrabold">إقرار واعتماد لجنة التقويم الذاتي بالمدرسة</h3>
              <p className="mt-1 text-[11px] leading-5 text-muted">نقر نحن الموقعين أدناه بصحة واكتمال الشواهد والوثائق المرفقة في هذا التقرير، وأنها تمثل الواقع التعليمي والتربوي الفعلي للمدرسة للعام الدراسي الحالي، وجاهزة للعرض والمطابقة من قبل أخصائي التقويم الخارجي.</p>
              <div className="mt-4 grid grid-cols-3 gap-4 text-[11.5px]">
                <div className="rounded-lg border border-line bg-white p-3"><div className="text-muted">رئيس فريق التقويم الذاتي / المنسق</div><div className="mt-1 font-extrabold text-ink">{s?.coordinator || '……………………'}</div><div className="mt-6 border-t border-dashed border-line pt-1 text-[10px] text-muted">التوقيع: ………………… التاريخ: …… / …… / 14……هـ</div></div>
                <div className="rounded-lg border border-line bg-white p-3"><div className="text-muted">قائد المدرسة والمشرف العام</div><div className="mt-1 font-extrabold text-ink">{s?.principal || '……………………'}</div><div className="mt-6 border-t border-dashed border-line pt-1 text-[10px] text-muted">التوقيع: ………………… الختم الرسمي</div></div>
                <div className="rounded-lg border border-line bg-white p-3"><div className="text-muted">مرجع التحقق المحلي</div><div className="mt-1 font-mono text-[11px] font-extrabold text-ink" dir="ltr">{reportRef(s ?? null)}</div><div className="mt-1 text-[10px] text-muted">أُنشئ بواسطة دليل التقويم المدرسي v{info.data?.version} — {p.uploadedFiles} ملف موثق محليًا</div></div>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[10px] text-muted"><span>مسار التخزين المعتمد: <span className="font-mono" dir="ltr">{info.data?.dataDir}</span></span><span>وثيقة رسمية مخصصة للتقويم المدرسي — {school.data?.name}</span></div>
        </div>
      </div>
    </>
  )
}
