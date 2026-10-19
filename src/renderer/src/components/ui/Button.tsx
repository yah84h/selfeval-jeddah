import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'teal' | 'outline'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-600 shadow-sm',
  teal: 'bg-teal text-white hover:brightness-95 shadow-sm',
  secondary: 'bg-primary-soft text-primary hover:bg-primary-line/60',
  outline: 'border border-line bg-white text-ink hover:bg-primary-soft/60',
  ghost: 'text-muted hover:bg-primary-soft hover:text-primary',
  danger: 'bg-danger-soft text-danger hover:bg-danger hover:text-white'
}
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl'
}

export function Button({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean; children: ReactNode }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-primary/50 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : null}
      {children}
    </button>
  )
}

export function IconButton({ title, children, className = '', variant = 'ghost', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { title: string; variant?: 'ghost' | 'danger' | 'teal' }) {
  const v = variant === 'danger' ? 'hover:bg-danger-soft hover:text-danger text-muted' : variant === 'teal' ? 'hover:bg-teal-soft hover:text-teal text-muted' : 'hover:bg-primary-soft hover:text-primary text-muted'
  return (
    <button {...rest} title={title} aria-label={title} className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${v} ${className}`}>
      {children}
    </button>
  )
}
