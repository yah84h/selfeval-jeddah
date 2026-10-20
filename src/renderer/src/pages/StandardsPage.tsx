import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Eye, EyeOff, FileText, Layers3, Paperclip, RefreshCw, Search, ShieldCheck, TrendingUp, ExternalLink } from 'lucide-react'
import { domainDescriptions, indicatorCount, witnessCount } from '@shared/evaluationData'
import type { CriterionProgress, DomainProgress, Evidence, IndicatorProgress } from '@shared/types'
import { useProgress } from '@/lib/queries'
import { Card, Pill, SectionHeading, inputClass } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useEvidenceActions } from '@/features/evidence/useEvidenceActions'
import { AddCustomWitnessButton, WitnessHeader, WitnessRow } from '@/features/evidence/WitnessRow'
import { PreviewDialog } from '@/features/evidence/PreviewDialog'
import { kindBadge } from '@/features/evidence/FileItem'
import { fileKind, formatDate, formatSize } from '@/lib/format'

type StatusFilter = 'all' | 'missing' | 'complete'
const ordinal = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع']

export function StandardsPage({ initialDomainId, initialIndicatorCode }: { initialDomainId?: number; initialIndicatorCode?: string }) {
  const progress = useProgress()
  const actions = useEvidenceActions()
  const [activeDomain, setActiveDomain] = useState(initialDomainId ?? 1)
  const [expanded, setExpanded] = useState<string | null>(initialIndicatorCode ?? null)
  const [collapsedCriteria, setCollapsedCriteria] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [preview, setPreview] = useState<{ id: number; name: string } | null>(null)
  const [selectedFile, setSelectedFile] = useState<{ file: Evidence; code: string } | null>(null)
  const scrollTarget = useRef<HTMLDivElement | null>(null)

  useEffect(() => { if (initialIndicatorCode) setTimeout(() => scrollTarget.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150) }, [initialIndicatorCode])

  const domain: DomainProgress | undefined = progress.data?.domains.find(d => d.id === activeDomain)
  const query = search.trim()
  const filteredCriteria = useMemo(() => {
    if (!domain) return []
    return domain.criteria.map(c => ({
      ...c,
      indicators: c.indicators.filter(i => {
        if (i.notApplicable) return !query // المستبعدة تظهر في شريطها فقط عند عدم البحث
        if (status === 'missing' && i.completed >= i.total) return false
        if (status === 'complete' && i.completed < i.total) return false
        if (!query) return true
        return i.code.includes(query) || i.displayCode.includes(query) || i.text.includes(query) || i.witnesses.some(w => w.displayName.includes(query))
      })
    })).filter(c => c.indicators.length)
  }, [domain, query, status])

  // آخر ملف للمعاينة السريعة: المحدد يدويًا أو أحدث ملف في المجال
  const allFiles = useMemo(() => (progress.data?.domains ?? []).flatMap(d => d.criteria.flatMap(c => c.indicators.flatMap(i => i.witnesses.flatMap(w => w.files.map(f => ({ file: f, code: i.displayCode })))))), [progress.data])
  const quick = selectedFile ?? [...allFiles].sort((a, b) => b.file.createdAt.localeCompare(a.file.createdAt))[0] ?? null
  const weekly = useMemo(() => {
    const now = Date.now(); const weekMs = 7 * 24 * 3600 * 1000
    const buckets = Array.from({ length: 8 }, (_, k) => allFiles.filter(x => { const t = new Date(x.file.createdAt).getTime(); return t <= now - (7 - k) * weekMs + weekMs && t > now - (7 - k) * weekMs }).length)
    let acc = allFiles.filter(x => new Date(x.file.createdAt).getTime() <= now - 8 * weekMs).length
    return buckets.map(b => (acc += b))
  }, [allFiles])
  const thisWeek = allFiles.filter(x => Date.now() - new Date(x.file.createdAt).getTime() < 7 * 24 * 3600 * 1000).length

  return (
    <>
      <SectionHeading eyebrow="● دليل معايير ومؤشرات التقويم المدرسي" title="المجالات والمعايير والشواهد المعتمدة"
        description={`استعراض تفصيلي للمجالات الأربعة والـ11 معيارًا مع قائمة الـ${indicatorCount} مؤشرًا وآلية إرفاق الـ${witnessCount} شاهدًا المعتمدة محليًا.`}
        action={<><Pill tone="mint" className="h-9 px-3"><ShieldCheck size={13} /> تخزين محلي 100%</Pill><Button onClick={() => progress.refetch()}><RefreshCw size={14} /> مزامنة المستودع المحلي</Button></>} />

      {/* شريط الفلاتر */}
      <Card className="mb-4 flex items-center gap-3 p-3">
        <div className="relative flex-1"><Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" /><input className={`${inputClass} h-10 pr-9`} placeholder="ابحث برقم المؤشر (مثال: 1-1-1-1) أو اسم الشاهد…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select className={`${inputClass} h-10 w-56`} value={activeDomain} onChange={e => { setActiveDomain(Number(e.target.value)); setExpanded(null) }}>
          {progress.data?.domains.map(d => <option key={d.id} value={d.id}>مجال {d.name}</option>)}
        </select>
        <select className={`${inputClass} h-10 w-44`} value={status} onChange={e => setStatus(e.target.value as StatusFilter)}>
          <option value="all">حالة الشاهد (الكل)</option><option value="missing">الناقص فقط</option><option value="complete">المكتمل فقط</option>
        </select>
      </Card>

      {/* بطاقات المجالات */}
      <div className="mb-5 grid grid-cols-4 gap-3">
        {progress.data?.domains.map(d => {
          const pct = d.total ? Math.round((d.completed / d.total) * 100) : 0
          const active = d.id === activeDomain
          return (
            <button key={d.id} onClick={() => { setActiveDomain(d.id); setExpanded(null) }} className={`overflow-hidden rounded-2xl border bg-white text-right shadow-card transition ${active ? 'border-primary' : 'border-line hover:border-primary-line'}`}>
              <div className={`h-1.5 ${active ? 'bg-primary' : 'bg-transparent'}`} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2"><span className="text-[15px] font-extrabold leading-6 text-ink">{d.icon} مجال {d.name}</span><Pill tone={active ? 'mint' : 'lavender'}>{pct}%</Pill></div>
                <div className="mt-2 text-[11.5px] text-muted">الشواهد المرفقة: <b className="text-ink">{d.completed} / {d.total} شاهد</b></div>
                <div className="stat-line mt-2"><i style={{ width: `${pct}%`, background: active ? '#4b20b8' : '#b9a8ea' }} /></div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-4">
        {/* القائمة الرئيسية */}
        <div className="min-w-0 space-y-4">
          {domain && (
            <div className="flex items-center gap-3 px-1"><span className="text-2xl">{domain.icon}</span><div><h2 className="text-base font-extrabold text-primary">مجال {domain.name}</h2><p className="text-[12px] text-muted">{domainDescriptions[domain.id]}</p></div></div>
          )}
          {filteredCriteria.map((criterion, idx) => (
            <CriterionCard key={criterion.id} index={domain?.criteria.findIndex(c => c.id === criterion.id) ?? idx} criterion={criterion} collapsed={collapsedCriteria.has(criterion.id)}
              onToggleCollapse={() => setCollapsedCriteria(s => { const n = new Set(s); n.has(criterion.id) ? n.delete(criterion.id) : n.add(criterion.id); return n })}
              expanded={expanded} setExpanded={setExpanded} actions={actions}
              onPreview={(id, name, code) => { const f = allFiles.find(x => x.file.id === id); if (f) setSelectedFile({ file: f.file, code }); setPreview({ id, name }) }}
              scrollRef={scrollTarget} targetCode={initialIndicatorCode} />
          ))}
          {filteredCriteria.length === 0 && <Card className="p-8 text-center text-sm text-muted">لا توجد مؤشرات مطابقة للفلتر الحالي.</Card>}
        </div>

        {/* العمود الجانبي */}
        <aside className="space-y-4 self-start">
          <Card className="p-4">
            <div className="flex items-center justify-between"><h3 className="flex items-center gap-1.5 text-sm font-extrabold"><Eye size={14} className="text-primary" /> المعاينة السريعة للشاهد</h3>{quick && <Pill tone="lavender" className="font-mono">{quick.code.replace(/[()]/g, '')}</Pill>}</div>
            {quick ? (
              <>
                <div className="mt-3 rounded-xl bg-lavender/60 p-4 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white text-primary shadow-sm"><FileText size={24} /></div>
                  <div className="mt-2 truncate text-[12.5px] font-extrabold text-ink" title={quick.file.fileName}>{quick.file.fileName}</div>
                  <div className="text-[10.5px] text-muted"><span className={`rounded px-1 font-mono font-bold ${kindBadge[fileKind(quick.file.fileName)].cls}`}>{kindBadge[fileKind(quick.file.fileName)].label}</span> · {formatSize(quick.file.fileSize)}</div>
                  <Button size="sm" className="mt-3 w-full" onClick={() => setPreview({ id: quick.file.id, name: quick.file.fileName })}><ExternalLink size={13} /> فتح بالمستعرض</Button>
                </div>
                <dl className="mt-3 space-y-1 text-[11.5px]">
                  <div className="flex justify-between"><dt className="text-muted">تاريخ الرفع:</dt><dd className="font-bold">{formatDate(quick.file.createdAt)}</dd></div>
                  {quick.file.note && <div className="flex justify-between"><dt className="text-muted">ملاحظة:</dt><dd className="font-bold">{quick.file.note}</dd></div>}
                  <div className="flex justify-between"><dt className="text-muted">درجة الموثوقية:</dt><dd className="font-bold text-success">✓ محفوظ محليًا</dd></div>
                </dl>
              </>
            ) : <p className="mt-3 text-[12px] text-muted">لم تُرفع وثائق بعد. ستظهر هنا آخر وثيقة رفعتها أو عاينتها.</p>}
          </Card>

          <Card className="bg-lavender/50 p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-primary"><ShieldCheck size={14} /> ضوابط قبول الشواهد</h3>
            <ul className="mt-2 list-disc space-y-1.5 pr-4 text-[11.5px] leading-5 text-ink/80">
              <li>أن تكون الوثائق حديثة وتخص العام الدراسي الحالي.</li>
              <li>تضمين الختام الرسمي لقائد المدرسة والتاريخ المعتمد.</li>
              <li>عدم دمج شواهد متعددة في ملف واحد إلا إذا ارتبطت بنفس المؤشر.</li>
              <li>الصيغ المقبولة: PDF، Word، Excel، PowerPoint، الصور — بحد أقصى 50 ميجابايت.</li>
              <li>التخزين المحلي يضمن سرية السجلات الأكاديمية والدرجات.</li>
            </ul>
          </Card>

          <Card className="p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-extrabold"><TrendingUp size={14} className="text-teal" /> مؤشر الإنجاز العام للشواهد</h3>
            <div className="mt-1 flex items-end gap-2"><span className="text-3xl font-extrabold text-primary">{progress.data?.completed ?? 0}</span><span className="pb-1 text-[11.5px] text-muted">/ {progress.data?.total ?? 0} شاهدًا</span>{thisWeek > 0 && <Pill tone="mint" className="mr-auto">+{thisWeek} هذا الأسبوع</Pill>}</div>
            <Sparkline values={weekly} />
            <div className="flex justify-between text-[10px] text-muted"><span>قبل 8 أسابيع</span><span>الآن</span></div>
          </Card>
        </aside>
      </div>

      <PreviewDialog fileId={preview?.id ?? null} fileName={preview?.name ?? ''} onClose={() => setPreview(null)} />
    </>
  )
}

function Sparkline({ values }: { values: number[] }) {
  const w = 240, h = 60
  const max = Math.max(1, ...values)
  const pts = values.map((v, k) => `${(k / (values.length - 1)) * w},${h - (v / max) * (h - 6) - 3}`)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-16 w-full" preserveAspectRatio="none">
      <polyline points={`0,${h} ${pts.join(' ')} ${w},${h}`} fill="#ece6fa" stroke="none" />
      <polyline points={pts.join(' ')} fill="none" stroke="#4b20b8" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={w} cy={pts.at(-1)?.split(',')[1]} r="3.5" fill="#4b20b8" />
    </svg>
  )
}

function CriterionCard({ index, criterion, collapsed, onToggleCollapse, expanded, setExpanded, actions, onPreview, scrollRef, targetCode }: {
  index: number; criterion: CriterionProgress; collapsed: boolean; onToggleCollapse: () => void
  expanded: string | null; setExpanded: (c: string | null) => void
  actions: ReturnType<typeof useEvidenceActions>; onPreview: (id: number, name: string, code: string) => void
  scrollRef: React.MutableRefObject<HTMLDivElement | null>; targetCode?: string
}) {
  const [showHidden, setShowHidden] = useState(false)
  const active = criterion.indicators.filter(i => !i.notApplicable)
  const hidden = criterion.indicators.filter(i => i.notApplicable)
  const pct = criterion.total ? Math.round((criterion.completed / criterion.total) * 100) : 0
  return (
    <Card className="overflow-hidden">
      <button onClick={onToggleCollapse} className="flex w-full items-center gap-3 bg-lavender/50 px-5 py-4 text-right">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-primary shadow-sm"><Layers3 size={20} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-extrabold text-ink">المعيار {ordinal[index] ?? index + 1}: {criterion.name}</h3>
          <p className="text-[11.5px] text-muted">{active.length} مؤشرات قياس أداء | {criterion.total} شاهدًا توثيقيًا إلزاميًا{hidden.length > 0 && <span className="text-warn"> · {hidden.length} مؤشر لا ينطبق</span>}</p>
        </div>
        <Pill tone={pct === 100 ? 'mint' : 'lavender'} className="px-3 py-1.5">{pct === 100 ? 'مكتمل وموثق' : 'مكتمل'} {pct}% ({criterion.completed}/{criterion.total})</Pill>
        <ChevronDown size={18} className={`text-muted transition ${collapsed ? '' : 'rotate-180'}`} />
      </button>
      {!collapsed && (
        <div className="space-y-3 p-4">
          {active.map(indicator => (
            <IndicatorRow key={indicator.code} indicator={indicator} open={expanded === indicator.code} onToggle={() => setExpanded(expanded === indicator.code ? null : indicator.code)} actions={actions} onPreview={onPreview} ref={targetCode === indicator.code ? scrollRef : undefined} />
          ))}
          {active.length === 0 && <div className="px-2 py-3 text-sm text-muted">كل مؤشرات هذا المعيار مستبعدة («لا ينطبق»).</div>}
          {hidden.length > 0 && (
            <div className="rounded-xl border border-dashed border-line bg-paper/60">
              <button onClick={() => setShowHidden(v => !v)} className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-bold text-muted hover:text-warn"><EyeOff size={13} /> مؤشرات مستبعدة لا تنطبق على المدرسة ({hidden.length}) <ChevronDown size={13} className={`transition ${showHidden ? 'rotate-180' : ''}`} /></button>
              {showHidden && hidden.map(indicator => (
                <div key={indicator.code} className="flex items-center gap-3 border-t border-line/60 px-4 py-2.5 opacity-80">
                  <Pill tone="warn" className="font-mono">{indicator.code.replace(/[()]/g, '')}</Pill>
                  <span className="flex-1 text-sm text-muted line-through decoration-muted/40">{indicator.text}</span>
                  {indicator.excludeReason && <span className="text-[11px] text-muted">— {indicator.excludeReason}</span>}
                  <Button size="sm" variant="outline" loading={actions.busyKey === `ind-${indicator.code}`} onClick={() => actions.includeIndicator(indicator.code)}><Eye size={13} /> تفعيل</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function IndicatorRow({ indicator, open, onToggle, actions, onPreview, ref }: {
  indicator: IndicatorProgress; open: boolean; onToggle: () => void
  actions: ReturnType<typeof useEvidenceActions>; onPreview: (id: number, name: string, code: string) => void
  ref?: React.MutableRefObject<HTMLDivElement | null>
}) {
  const files = indicator.witnesses.reduce((s, w) => s + w.files.length, 0)
  const excludedCount = indicator.witnesses.filter(w => w.excluded).length
  const requiredCount = indicator.witnesses.filter(w => !w.isCustom).length
  const renumbered = indicator.displayCode !== indicator.code
  const done = indicator.total > 0 && indicator.completed === indicator.total
  const missing = indicator.total - indicator.completed
  return (
    <div ref={ref} className={`rounded-xl border ${open ? 'border-primary-line bg-white' : 'border-line bg-white'}`}>
      <button onClick={onToggle} className="flex w-full items-start gap-3 px-4 py-3 text-right">
        <Pill tone="lavender" className="mt-0.5 font-mono" >{indicator.displayCode.replace(/[()]/g, '')}</Pill>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-extrabold leading-6 text-ink" title={renumbered ? `الرمز الأصلي في الدليل: ${indicator.code}` : undefined}>{indicator.text}</div>
          <div className="text-[11px] text-muted">{done ? `${indicator.total} شواهد مطلوبة تم التحقق منها ومطابقتها للمتطلبات الوزارية` : missing === 1 ? 'متبقي شاهد واحد مطلوب لاستكمال معايير التدقيق بالمعيار' : `متبقٍ ${missing} شواهد مطلوبة لاستكمال معايير التدقيق`}</div>
        </div>
        {files > 0 && <span className="flex items-center gap-1 text-[11px] font-bold text-muted"><Paperclip size={11} /> {files}</span>}
        <Pill tone={done ? 'mint' : 'lavender'}>{indicator.completed} / {indicator.total} شواهد</Pill>
        <ChevronDown size={16} className={`mt-1 text-muted transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-line px-4 pb-4 pt-3">
          <WitnessHeader indicatorCode={indicator.code} count={indicator.total} completed={indicator.completed} excludedCount={excludedCount} requiredCount={requiredCount} actions={actions} />
          <div className="space-y-2">
            {indicator.witnesses.map(w => <WitnessRow key={`${w.isCustom ? 'c' : 'r'}-${w.name}`} indicatorCode={indicator.code} witness={w} actions={actions} onPreview={id => { const f = w.files.find(x => x.id === id); onPreview(id, f?.fileName ?? '', indicator.displayCode) }} />)}
            <AddCustomWitnessButton indicatorCode={indicator.code} actions={actions} />
          </div>
        </div>
      )}
    </div>
  )
}


