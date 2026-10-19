import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Layers3, Paperclip, Search } from 'lucide-react'
import { domainDescriptions, indicatorCount, witnessCount } from '@shared/evaluationData'
import type { CriterionProgress, DomainProgress, IndicatorProgress } from '@shared/types'
import { useProgress } from '@/lib/queries'
import { Card, SectionHeading } from '@/components/ui/Card'
import { inputClass } from '@/components/ui/Card'
import { useEvidenceActions } from '@/features/evidence/useEvidenceActions'
import { AddCustomWitnessButton, WitnessHeader, WitnessRow } from '@/features/evidence/WitnessRow'
import { PreviewDialog } from '@/features/evidence/PreviewDialog'

export function StandardsPage({ initialDomainId, initialIndicatorCode }: { initialDomainId?: number; initialIndicatorCode?: string }) {
  const progress = useProgress()
  const actions = useEvidenceActions()
  const [activeDomain, setActiveDomain] = useState(initialDomainId ?? 1)
  const [expanded, setExpanded] = useState<string | null>(initialIndicatorCode ?? null)
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState<{ id: number; name: string } | null>(null)
  const scrollTarget = useRef<HTMLDivElement | null>(null)

  useEffect(() => { if (initialIndicatorCode) setTimeout(() => scrollTarget.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150) }, [initialIndicatorCode])

  const domain: DomainProgress | undefined = progress.data?.domains.find(d => d.id === activeDomain)
  const query = search.trim()
  const filteredCriteria = useMemo(() => {
    if (!domain) return []
    if (!query) return domain.criteria
    return domain.criteria.map(c => ({ ...c, indicators: c.indicators.filter(i => i.code.includes(query) || i.text.includes(query) || i.witnesses.some(w => w.displayName.includes(query))) })).filter(c => c.indicators.length)
  }, [domain, query])

  return (
    <>
      <SectionHeading eyebrow="المجالات والمعايير والمؤشرات" title="رفع الشواهد ومتابعتها"
        description={`${indicatorCount} مؤشرًا و${witnessCount} شاهدًا مطلوبًا. افتح المؤشر، ثم اضغط «رفع شاهد» أو اسحب الملفات إلى الوثيقة.`}
        action={<div className="relative"><Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" /><input className={`${inputClass} h-10 w-72 pr-9`} placeholder="بحث في المؤشرات والوثائق…" value={search} onChange={e => setSearch(e.target.value)} /></div>} />

      <div className="grid grid-cols-[280px_1fr] gap-5">
        <aside className="space-y-2 self-start">
          {progress.data?.domains.map(d => {
            const pct = d.total ? Math.round((d.completed / d.total) * 100) : 0
            const active = d.id === activeDomain
            return (
              <button key={d.id} onClick={() => { setActiveDomain(d.id); setExpanded(null) }}
                className={`block w-full rounded-2xl border p-4 text-right transition ${active ? 'border-primary bg-primary text-white shadow-card' : 'border-line bg-white hover:border-primary-line'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{d.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-extrabold">المجال {d.id}: {d.name}</div>
                    <div className={`text-[11px] ${active ? 'text-white/75' : 'text-muted'}`}>{d.criteria.length} معايير · {d.criteria.reduce((s, c) => s + c.indicators.length, 0)} مؤشرات</div>
                  </div>
                </div>
                <div className={`mt-3 h-1.5 overflow-hidden rounded-full ${active ? 'bg-white/25' : 'bg-primary-soft'}`}><div className={`h-full rounded-full ${active ? 'bg-[#9fe9e5]' : 'bg-teal'}`} style={{ width: `${pct}%` }} /></div>
                <div className={`mt-1 text-[11px] font-bold ${active ? 'text-white/85' : 'text-teal'}`}>{d.completed}/{d.total} · {pct}%</div>
              </button>
            )
          })}
        </aside>

        <div className="min-w-0">
          {domain && (
            <Card className="mb-4 flex items-center gap-4 border-primary-line bg-gradient-to-l from-primary-soft to-white p-5">
              <span className="text-4xl">{domain.icon}</span>
              <div className="flex-1">
                <h2 className="text-lg font-extrabold text-primary">المجال {domain.id}: {domain.name}</h2>
                <p className="text-sm text-muted">{domainDescriptions[domain.id]}</p>
              </div>
              <Layers3 size={30} className="text-primary-line" />
            </Card>
          )}
          <div className="space-y-4">
            {filteredCriteria.map(criterion => (
              <CriterionCard key={criterion.id} criterion={criterion} expanded={expanded} setExpanded={setExpanded} actions={actions} onPreview={(id, name) => setPreview({ id, name })} scrollRef={scrollTarget} targetCode={initialIndicatorCode} />
            ))}
            {filteredCriteria.length === 0 && <Card className="p-8 text-center text-sm text-muted">لا توجد نتائج مطابقة لـ «{query}»</Card>}
          </div>
        </div>
      </div>

      <PreviewDialog fileId={preview?.id ?? null} fileName={preview?.name ?? ''} onClose={() => setPreview(null)} />
    </>
  )
}

function CriterionCard({ criterion, expanded, setExpanded, actions, onPreview, scrollRef, targetCode }: {
  criterion: CriterionProgress; expanded: string | null; setExpanded: (c: string | null) => void
  actions: ReturnType<typeof useEvidenceActions>; onPreview: (id: number, name: string) => void
  scrollRef: React.MutableRefObject<HTMLDivElement | null>; targetCode?: string
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line bg-teal-soft/60 px-5 py-3">
        <span className="rounded-lg bg-teal px-2.5 py-0.5 text-xs font-extrabold text-white">{criterion.id}</span>
        <h3 className="flex-1 text-sm font-extrabold text-ink">المعيار: {criterion.name}</h3>
        <span className="text-xs font-bold text-teal">{criterion.completed}/{criterion.total} · {criterion.indicators.length} مؤشرات</span>
      </div>
      <div className="divide-y divide-line">
        {criterion.indicators.map(indicator => (
          <IndicatorRow key={indicator.code} indicator={indicator} open={expanded === indicator.code} onToggle={() => setExpanded(expanded === indicator.code ? null : indicator.code)} actions={actions} onPreview={onPreview}
            ref={targetCode === indicator.code ? scrollRef : undefined} />
        ))}
      </div>
    </Card>
  )
}

function IndicatorRow({ indicator, open, onToggle, actions, onPreview, ref }: {
  indicator: IndicatorProgress; open: boolean; onToggle: () => void
  actions: ReturnType<typeof useEvidenceActions>; onPreview: (id: number, name: string) => void
  ref?: React.MutableRefObject<HTMLDivElement | null>
}) {
  const files = indicator.witnesses.reduce((s, w) => s + w.files.length, 0)
  const done = indicator.completed === indicator.total
  return (
    <div ref={ref} className={open ? 'bg-blue-soft/40' : ''}>
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-5 py-3.5 text-right hover:bg-blue-soft/40">
        <code className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold ${done ? 'bg-success-soft text-success' : 'bg-blue-soft text-blue'}`}>{indicator.code}</code>
        <span className="flex-1 text-sm font-semibold leading-6 text-ink">{indicator.text}</span>
        {files > 0 && <span className="flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary"><Paperclip size={11} /> {files}</span>}
        <span className="text-[11px] font-bold text-muted">{indicator.completed}/{indicator.total}</span>
        <ChevronDown size={17} className={`text-muted transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5">
          <WitnessHeader count={indicator.total} completed={indicator.completed} />
          <div className="space-y-2">
            {indicator.witnesses.map(w => <WitnessRow key={`${w.isCustom ? 'c' : 'r'}-${w.name}`} indicatorCode={indicator.code} witness={w} actions={actions} onPreview={id => { const f = w.files.find(x => x.id === id); onPreview(id, f?.fileName ?? '') }} />)}
            <AddCustomWitnessButton indicatorCode={indicator.code} actions={actions} />
          </div>
        </div>
      )}
    </div>
  )
}
