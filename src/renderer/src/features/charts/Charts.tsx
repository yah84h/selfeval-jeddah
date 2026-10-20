// رسوم بيانية خفيفة بـ SVG (بلا مكتبات) — متسقة مع هوية التطبيق وتدعم RTL
import { useMemo, useState } from 'react'

export const DOMAIN_COLORS: Record<number, string> = { 1: '#4b20b8', 2: '#1e7f7b', 3: '#2459c9', 4: '#5fd3cf' }
export const DOMAIN_SOFT: Record<number, string> = { 1: '#ece6fa', 2: '#d9f3f1', 3: '#e3ecfb', 4: '#e4f8f7' }

/** شريط أفقي لكل عنصر مع النسبة والعدد */
export function BarList({ items }: { items: Array<{ label: string; value: number; total: number; color: string; hint?: string }> }) {
  return (
    <div className="space-y-3">
      {items.map((it, k) => {
        const pct = it.total ? Math.round((it.value / it.total) * 100) : 0
        return (
          <div key={k} title={it.hint ?? `${it.value} من ${it.total}`}>
            <div className="mb-1 flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-2 font-bold text-ink"><i className="h-2 w-2 rounded-full" style={{ background: it.color }} />{it.label}</span>
              <span className="font-extrabold" style={{ color: it.color }}>{pct}%<span className="mr-1 text-[10.5px] font-semibold text-muted">({it.value}/{it.total})</span></span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#ebe7f5]"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: it.color }} /></div>
          </div>
        )
      })}
    </div>
  )
}

/** حلقة (Donut) بأجزاء ملوّنة ورقم في المنتصف */
export function Donut({ parts, centerValue, centerLabel, size = 170, thickness = 22 }: { parts: Array<{ label: string; value: number; color: string }>; centerValue: string | number; centerLabel: string; size?: number; thickness?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const total = Math.max(1, parts.reduce((s, p) => s + p.value, 0))
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  const arcs = parts.map((p, k) => {
    const len = (p.value / total) * c
    const arc = { ...p, dash: `${len} ${c - len}`, offset: -offset, k }
    offset += len
    return arc
  })
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={centerLabel}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ebe7f5" strokeWidth={thickness} />
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {arcs.map(a => a.value > 0 && (
            <circle key={a.k} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={a.color} strokeWidth={hover === a.k ? thickness + 4 : thickness}
              strokeDasharray={a.dash} strokeDashoffset={a.offset} strokeLinecap="butt" style={{ transition: 'stroke-width .15s' }}
              onMouseEnter={() => setHover(a.k)} onMouseLeave={() => setHover(null)}><title>{a.label}: {a.value} ({Math.round((a.value / total) * 100)}%)</title></circle>
          ))}
        </g>
        <text x="50%" y="48%" textAnchor="middle" fontSize="30" fontWeight="800" fill="#29233c" fontFamily="Tajawal">{hover !== null ? parts[hover].value : centerValue}</text>
        <text x="50%" y="62%" textAnchor="middle" fontSize="11" fontWeight="700" fill="#716b82" fontFamily="Tajawal">{hover !== null ? parts[hover].label : centerLabel}</text>
      </svg>
    </div>
  )
}

/** منحنى مساحي للقيم الأسبوعية مع نقاط وتلميح */
export function AreaChart({ values, labels, color = '#4b20b8', height = 150 }: { values: number[]; labels: string[]; color?: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const w = 600, h = height, padX = 46, padTop = 16, padBottom = 24
  const max = Math.max(1, ...values)
  const pts = useMemo(() => values.map((v, k) => ({ x: padX + (k / Math.max(1, values.length - 1)) * (w - padX * 2), y: padTop + (1 - v / max) * (h - padTop - padBottom), v })), [values, max, h])
  const line = pts.map(p => `${p.x},${p.y}`).join(' ')
  const gridY = [0, 0.5, 1].map(t => padTop + t * (h - padTop - padBottom))
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} role="img" aria-label="تقدم رفع الشواهد" onMouseLeave={() => setHover(null)}>
      <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.28" /><stop offset="1" stopColor={color} stopOpacity="0.02" /></linearGradient></defs>
      {gridY.map((y, k) => <line key={k} x1={padX} x2={w - padX} y1={y} y2={y} stroke="#ebe7f5" strokeDasharray="3 4" />)}
      <polygon points={`${pts[0]?.x ?? 0},${h - padBottom} ${line} ${pts.at(-1)?.x ?? w},${h - padBottom}`} fill="url(#areaGrad)" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, k) => (
        <g key={k} onMouseEnter={() => setHover(k)}>
          <rect x={p.x - (w / values.length) / 2} y={0} width={w / values.length} height={h} fill="transparent" />
          <circle cx={p.x} cy={p.y} r={hover === k ? 5.5 : 3.5} fill="#fff" stroke={color} strokeWidth="2.5" />
          <text x={p.x} y={h - 6} textAnchor="middle" fontSize="10.5" fill="#716b82" fontFamily="Tajawal">{labels[k]}</text>
          {hover === k && (
            <g>
              <rect x={p.x - 30} y={Math.max(0, p.y - 34)} width="60" height="22" rx="6" fill="#29233c" />
              <text x={p.x} y={Math.max(0, p.y - 34) + 15} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" fontFamily="Tajawal">{p.v} شاهدًا</text>
            </g>
          )}
        </g>
      ))}
    </svg>
  )
}

/** أعمدة رأسية مجمّعة (مكتمل / ناقص) لكل مجال */
export function GroupedBars({ groups }: { groups: Array<{ label: string; complete: number; missing: number; color: string }> }) {
  const [hover, setHover] = useState<number | null>(null)
  const w = 460, h = 230, padBottom = 30, padTop = 22
  const max = Math.max(1, ...groups.map(g => g.complete + g.missing))
  const slot = w / groups.length
  const barW = Math.min(50, slot * 0.34)
  const yOf = (v: number): number => padTop + (1 - v / max) * (h - padTop - padBottom)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} role="img" aria-label="المكتمل والناقص لكل مجال" onMouseLeave={() => setHover(null)}>
      {[0, 0.5, 1].map(t => <line key={t} x1="0" x2={w} y1={padTop + t * (h - padTop - padBottom)} y2={padTop + t * (h - padTop - padBottom)} stroke="#ebe7f5" strokeDasharray="3 4" />)}
      {groups.map((g, k) => {
        const cx = slot * k + slot / 2
        const dim = hover !== null && hover !== k
        return (
          <g key={k} opacity={dim ? 0.45 : 1} onMouseEnter={() => setHover(k)} style={{ transition: 'opacity .15s' }}>
            <rect x={cx - barW - 3} y={yOf(g.complete)} width={barW} height={h - padBottom - yOf(g.complete)} rx="6" fill={g.color}><title>{g.label} — مكتمل: {g.complete}</title></rect>
            <rect x={cx + 3} y={yOf(g.missing)} width={barW} height={h - padBottom - yOf(g.missing)} rx="6" fill="#f3c6cf"><title>{g.label} — ناقص: {g.missing}</title></rect>
            <text x={cx - barW / 2 - 3} y={yOf(g.complete) - 5} textAnchor="middle" fontSize="11" fontWeight="800" fill={g.color} fontFamily="Tajawal">{g.complete}</text>
            <text x={cx + barW / 2 + 3} y={yOf(g.missing) - 5} textAnchor="middle" fontSize="11" fontWeight="800" fill="#d1364f" fontFamily="Tajawal">{g.missing}</text>
            <text x={cx} y={h - 8} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#29233c" fontFamily="Tajawal">{g.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

export function Legend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] font-bold text-muted">
      {items.map(it => <span key={it.label} className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />{it.label}</span>)}
    </div>
  )
}
