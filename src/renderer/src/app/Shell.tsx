import type { ReactNode } from 'react'
import { BookOpen, Database, Download, FolderOpen, LayoutDashboard, Layers3, Printer, School, Settings, Trash2 } from 'lucide-react'
import type { PageId } from './navigation'
import { useAppInfo, useProgress, useSchool, useTrash, useUpdateStatus } from '@/lib/queries'
import { Logo } from '@/components/Logo'

const items: Array<{ id: PageId; label: string; icon: ReactNode; hint?: string }> = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: <LayoutDashboard size={18} /> },
  { id: 'standards', label: 'المجالات والمعايير', icon: <Layers3 size={18} />, hint: 'رفع الشواهد' },
  { id: 'report', label: 'تقرير الإنجاز', icon: <Printer size={18} /> },
  { id: 'trash', label: 'سلة المحذوفات', icon: <Trash2 size={18} /> },
  { id: 'backup', label: 'النسخ الاحتياطي', icon: <Database size={18} /> },
  { id: 'settings', label: 'الإعدادات والتحديث', icon: <Settings size={18} /> },
  { id: 'about', label: 'عن الدليل', icon: <BookOpen size={18} /> }
]

export function Shell({ page, onNavigate, children }: { page: PageId; onNavigate: (p: PageId) => void; children: ReactNode }) {
  const school = useSchool()
  const info = useAppInfo()
  const progress = useProgress()
  const trash = useTrash()
  const update = useUpdateStatus()
  const updateReady = update.data?.state === 'available' || update.data?.state === 'downloaded'

  return (
    <div className="print-root flex h-full overflow-hidden">
      <aside className="no-print flex w-[268px] shrink-0 flex-col border-l border-line bg-white">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <Logo size={44} />
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold text-ink">دليل التقويم الذاتي</div>
            <div className="truncate text-[11px] font-semibold text-muted">المدرسي — تعليم جدة</div>
          </div>
        </div>

        <div className="mx-4 mt-4 rounded-xl bg-primary-soft px-3.5 py-3">
          <div className="flex items-center gap-2 text-primary"><School size={16} /><span className="truncate text-sm font-extrabold">{school.data?.name ?? 'ملف المدرسة'}</span></div>
          <div className="mt-2 flex items-center justify-between text-[12px] font-semibold text-muted">
            <span>الإنجاز</span><span className="text-teal">{progress.data?.percent ?? 0}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-teal transition-all" style={{ width: `${progress.data?.percent ?? 0}%` }} /></div>
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3">
          {items.map(item => {
            const active = item.id === page
            const badge = item.id === 'trash' ? trash.data?.length : item.id === 'settings' && updateReady ? '●' : undefined
            return (
              <button key={item.id} onClick={() => onNavigate(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-colors ${active ? 'bg-primary text-white shadow-sm' : 'text-ink hover:bg-primary-soft hover:text-primary'}`}>
                <span className={active ? 'text-white' : 'text-muted'}>{item.icon}</span>
                <span className="flex-1 text-right">{item.label}</span>
                {badge ? <span className={`rounded-full px-2 text-[11px] ${active ? 'bg-white/20 text-white' : item.id === 'settings' ? 'text-teal' : 'bg-primary-soft text-primary'}`}>{badge}</span> : null}
              </button>
            )
          })}
        </nav>

        <div className="border-t border-line px-4 py-3 text-[11px] text-muted">
          <div className="flex items-center justify-between">
            <span>الإصدار {info.data?.version ?? '…'}</span>
            <button className="flex items-center gap-1 font-bold text-primary hover:underline" onClick={() => window.api.app.openDataDir()}><FolderOpen size={13} /> مجلد البيانات</button>
          </div>
          {updateReady && <button onClick={() => onNavigate('settings')} className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-teal-soft py-1.5 font-bold text-teal"><Download size={13} /> تحديث جديد متاح</button>}
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[1180px] px-8 py-7">{children}</div>
      </main>
    </div>
  )
}
