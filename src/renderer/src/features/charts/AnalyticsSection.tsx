// قسم «التحليلات البيانية ومؤشرات التقدم» في الصفحة الرئيسية
import { useMemo } from 'react'
import { BarChart3, PieChart, Sparkles, TrendingUp, Layers3 } from 'lucide-react'
import type { ProgressReport } from '@shared/types'
import { Card, Pill } from '@/components/ui/Card'
import { AreaChart, BarList, Donut, GroupedBars, Legend, DOMAIN_COLORS } from './Charts'
import { fileKind } from '@/lib/format'

export function AnalyticsSection({ p }: { p: ProgressReport }) {
  const criteria = p.domains.flatMap(d => d.criteria.map(c => ({ label: `${c.name} (${c.id})`, value: c.completed, total: c.total, color: DOMAIN_COLORS[d.id], hint: `المجال ${d.id} · ${c.completed} من ${c.total}` })))
  const missing = p.total - p.completed
  const allFiles = p.domains.flatMap(d => d.criteria.flatMap(c => c.indicators.flatMap(i => i.witnesses.flatMap(w => w.files))))

  const weekly = useMemo(() => {
    const weekMs = 7 * 24 * 3600 * 1000
    const now = Date.now()
    const labels: string[] = []
    const values: number[] = []
    let acc = allFiles.filter(f => new Date(f.createdAt).getTime() <= now - 8 * weekMs).length
    for (let k = 7; k >= 0; k--) {
      const start = now - (k + 1) * weekMs, end = now - k * weekMs
      acc += allFiles.filter(f => { const t = new Date(f.createdAt).getTime(); return t > start && t <= end }).length
      values.push(acc)
      labels.push(k === 0 ? 'هذا الأسبوع' : `قبل ${k} أسابيع`.replace('قبل 1 أسابيع', 'الأسبوع الماضي').replace('قبل 2 أسابيع', 'قبل أسبوعين'))
    }
    return { labels, values }
  }, [allFiles])

  const kinds = useMemo(() => {
    const map: Record<string, number> = {}
    for (const f of allFiles) { const k = fileKind(f.fileName); map[k] = (map[k] ?? 0) + 1 }
    const names: Record<string, string> = { pdf: 'PDF', word: 'Word', excel: 'Excel', ppt: 'PowerPoint', image: 'صور', archive: 'مضغوط', other: 'أخرى' }
    const colors: Record<string, string> = { pdf: '#d1364f', word: '#2459c9', excel: '#0f9d6e', ppt: '#c77d05', image: '#08aaa5', archive: '#716b82', other: '#a89fc2' }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: names[k], value: v, color: colors[k] }))
  }, [allFiles])

  return (
    <section className="mt-7">
      <div className="mb-3 flex items-end justify-between">
        <div><h2 className="text-xl font-extrabold text-ink">التحليلات البيانية ومؤشرات التقدم</h2><p className="text-sm text-muted">لوحة الرسوم البيانية التفاعلية لحالة إنجاز المعايير وتدفق رفع الشواهد الـ{p.total}</p></div>
        <Pill tone="lavender"><Sparkles size={11} /> محدّث آليًا حتى اليوم</Pill>
      </div>

      <div className="grid grid-cols-[1.35fr_1fr] gap-4">
        {/* معدل إنجاز المعايير */}
        <Card className="p-5">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-lavender text-primary"><BarChart3 size={20} /></span><div><h3 className="text-[15px] font-extrabold">معدل إنجاز المعايير الـ{criteria.length} المعتمدة</h3><p className="text-[11.5px] text-muted">مقارنة نسب الإنجاز حسب تصنيف المجالات الأربعة</p></div></div>
            <Pill tone="mint">{criteria.length} معيارًا</Pill>
          </div>
          <BarList items={criteria} />
          <div className="mt-4 border-t border-line pt-3"><Legend items={p.domains.map(d => ({ label: d.name, color: DOMAIN_COLORS[d.id] }))} /></div>
        </Card>

        {/* جاهزية الشواهد */}
        <Card className="flex flex-col p-5">
          <div className="mb-2 flex items-start justify-between">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-[#0b6f6b]"><PieChart size={20} /></span><div><h3 className="text-[15px] font-extrabold">جاهزية الشواهد الـ{p.total}</h3><p className="text-[11.5px] text-muted">توزيع الوثائق حسب حالة التدقيق</p></div></div>
          </div>
          <div className="flex flex-1 items-center justify-center"><Donut size={210} thickness={26} centerValue={p.total} centerLabel="إجمالي الشواهد" parts={[
            { label: 'معتمد', value: p.completed, color: '#1e7f7b' },
            { label: 'ناقص', value: missing, color: '#c0392b' }
          ]} /></div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[{ v: p.completed, l: 'معتمد', c: '#1e7f7b' }, { v: missing, l: 'ناقص', c: '#c0392b' }].map(t => (
              <div key={t.l} className="rounded-xl bg-paper px-3 py-2 text-center"><div className="text-lg font-extrabold" style={{ color: t.c }}>{t.v}</div><div className="text-[10.5px] font-bold text-muted">{t.l} <span className="text-muted/70">({p.total ? Math.round((t.v / p.total) * 100) : 0}%)</span></div></div>
            ))}
          </div>
        </Card>

        {/* تدفق الرفع الأسبوعي */}
        <Card className="p-5">
          <div className="mb-2 flex items-start justify-between">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-lavender text-primary"><TrendingUp size={20} /></span><div><h3 className="text-[15px] font-extrabold">تدفق رفع الشواهد (آخر 8 أسابيع)</h3><p className="text-[11.5px] text-muted">العدد التراكمي للوثائق الموثقة محليًا</p></div></div>
            <Pill tone="lavender">{allFiles.length} ملفًا</Pill>
          </div>
          <AreaChart values={weekly.values} labels={weekly.labels} />
        </Card>

        {/* المكتمل والناقص لكل مجال + أنواع الملفات */}
        <Card className="p-5">
          <div className="mb-2 flex items-start justify-between">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-soft text-blue"><Layers3 size={20} /></span><div><h3 className="text-[15px] font-extrabold">المكتمل مقابل الناقص لكل مجال</h3><p className="text-[11.5px] text-muted">عدد الشواهد الموثقة والمتبقية</p></div></div>
          </div>
          <GroupedBars groups={p.domains.map(d => ({ label: d.name, complete: d.completed, missing: d.total - d.completed, color: DOMAIN_COLORS[d.id] }))} />
          <div className="mt-1 flex items-center justify-between"><Legend items={[{ label: 'مكتمل', color: '#4b20b8' }, { label: 'ناقص', color: '#f3c6cf' }]} />
            {kinds.length > 0 && <div className="flex items-center gap-2 text-[11px] text-muted">أنواع الملفات: {kinds.map(k => <span key={k.label} className="rounded-full px-2 py-0.5 font-bold text-white" style={{ background: k.color }}>{k.label} {k.value}</span>)}</div>}
          </div>
        </Card>
      </div>
    </section>
  )
}
