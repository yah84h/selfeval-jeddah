import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Dialog({ open, onClose, title, icon, children, footer, size = 'md', dismissible = true }: {
  open: boolean; onClose: () => void; title: string; icon?: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; dismissible?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape' && dismissible) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, dismissible])
  if (!open) return null
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-3xl', xl: 'max-w-6xl' }
  return (
    <div className="no-print fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4 backdrop-blur-[2px]" onMouseDown={() => dismissible && onClose()}>
      <div role="dialog" aria-modal="true" className={`flex max-h-[92vh] w-full ${widths[size]} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl`} onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          {icon && <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">{icon}</div>}
          <h2 className="flex-1 text-base font-extrabold text-ink">{title}</h2>
          {dismissible && (
            <button onClick={onClose} aria-label="إغلاق" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-primary-soft hover:text-primary"><X size={18} /></button>
          )}
        </div>
        <div className="flex-1 overflow-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line bg-paper px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}
