import type { HTMLAttributes, ReactNode } from 'react'

export function Card({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div {...rest} className={`rounded-2xl border border-line bg-white shadow-card ${className}`}>{children}</div>
}

export function SectionHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-bold tracking-wide text-teal">{eyebrow}</p>}
        <h1 className="text-2xl font-extrabold text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}

export function Stat({ label, value, tone = 'default' }: { label: string; value: ReactNode; tone?: 'default' | 'teal' | 'danger' | 'primary' }) {
  const tones = { default: 'text-ink', teal: 'text-teal', danger: 'text-danger', primary: 'text-primary' }
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <div className={`text-2xl font-extrabold ${tones[tone]}`}>{value}</div>
      <div className="text-xs font-semibold text-muted">{label}</div>
    </div>
  )
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white/60 px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">{icon}</div>
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'teal' | 'success' | 'danger' | 'warn' | 'primary' }) {
  const tones = {
    default: 'bg-primary-soft text-muted',
    primary: 'bg-primary-soft text-primary',
    teal: 'bg-teal-soft text-teal',
    success: 'bg-success-soft text-success',
    danger: 'bg-danger-soft text-danger',
    warn: 'bg-warn-soft text-warn'
  }
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-bold ${tones[tone]}`}>{children}</span>
}

export function ProgressRing({ percent, size = 148, label = 'نسبة الإنجاز' }: { percent: number; size?: number; label?: string }) {
  return (
    <div className="progress-ring grid place-items-center rounded-full" style={{ width: size, height: size, ['--progress' as string]: `${percent}%` }}>
      <div className="grid place-items-center rounded-full bg-white" style={{ width: size - 22, height: size - 22 }}>
        <strong className="text-3xl font-extrabold text-ink">{percent}%</strong>
        <span className="text-[11px] font-semibold text-muted">{label}</span>
      </div>
    </div>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export const inputClass = 'h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 placeholder:text-muted/70'
