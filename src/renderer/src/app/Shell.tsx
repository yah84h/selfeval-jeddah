import type { ReactNode } from 'react'
import { CheckCircle2, Database, Download, FolderOpen, Info, LayoutDashboard, Layers3, Printer, Settings, Trash2 } from 'lucide-react'
import type { PageId } from './navigation'
import { useAppInfo, useProgress, useSchool, useTrash, useUpdateStatus } from '@/lib/queries'
import { Logo } from '@/components/Logo'

const items: Array<{ id: PageId; label: string; icon: ReactNode }> = [
  { id: 'dashboard', label: 'الرئيسية والإحصائيات', icon: <LayoutDashboard size={17} /> },
  { id: 'standards', label: 'المجالات والمعايير', icon: <Layers3 size={17} /> },
  { id: 'report', label: 'تقرير الإنجاز والطباعة', icon: <Printer size={17} /> },
  { id: 'trash', label: 'سلة المحذوفات', icon: <Trash2 size={17} /> },
  { id: 'backup', label: 'النسخ الاحتياطي والاستعادة', icon: <Database size={17} /> },
  { id: 'settings', label: 'الإعدادات والتحديث', icon: <Settings size={17} /> },
  { id: 'about', label: 'عن الدليل', icon: <Info size={17} /> }
]

export function Shell({ page, onNavigate, children }: { page: PageId; onNavigate: (p: PageId) => void; children: ReactNode }) {
  const school = useSchool()
  const info = useAppInfo()
  const progress = useProgress()
  const trash = useTrash()
  const update = useUpdateStatus()
  const updateReady = update.data?.state === 'available' || update.data?.state === 'downloaded'
  const p = progress.data

  return (
    <div className="print-root flex h-full gap-4 overflow-hidden bg-paper p-4">
      <aside className="no-print flex w-[272px] shrink-0 flex-col gap-3">
        {/* الشعار */}
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3.5 shadow-card">
          <Logo size={46} />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-extrabold text-ink">دليل التقويم المدرسي</div>
            <div className="truncate text-[11px] font-semibold text-muted">الإدارة العامة للتعليم بجدة</div>
          </div>
        </div>

        {/* بطاقة المدرسة والإنجاز */}
        <div className="rounded-2xl border border-line bg-white px-4 py-3.5 shadow-card">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-extrabold leading-6 text-ink">{school.data?.name ?? 'ملف المدرسة'}</div>
              <div className="text-[11px] text-muted">الرقم الوزاري المعتمد</div>
            </div>
            {school.data?.ministryNumber && <span className="rounded-lg bg-paper px-2 py-1 font-mono text-[11px] font-bold text-ink" dir="ltr">{school.data.ministryNumber}</span>}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11.5px] font-semibold text-muted">
            <span>نسبة اكتمال الشواهد</span><span className="text-sm font-extrabold text-ink">{p?.percent ?? 0}%</span>
          </div>
          <div className="stat-line mt-1.5"><i style={{ width: `${p?.percent ?? 0}%`, background: 'linear-gradient(90deg,#08aaa5,#4b20b8)' }} /></div>
          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted"><CheckCircle2 size={12} className="text-teal" /> {p?.completed ?? 0} موثق من {p?.total ?? 0} شاهد</div>
        </div>

        {/* التنقل */}
        <nav className="flex-1 space-y-0.5 rounded-2xl border border-line bg-white p-2 shadow-card">
          {items.map(item => {
            const active = item.id === page
            const badge = item.id === 'standards' ? `${p?.domains.length ?? 4} مجالات` : item.id === 'trash' && trash.data?.length ? String(trash.data.length) : item.id === 'settings' && updateReady ? 'تحديث' : null
            return (
              <button key={item.id} onClick={() => onNavigate(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-bold transition-colors ${active ? 'bg-lavender text-primary' : 'text-muted hover:bg-paper hover:text-ink'}`}>
                <span className={active ? 'text-primary' : 'text-muted'}>{item.icon}</span>
                <span className="flex-1 text-right">{item.label}</span>
                {badge && <span className={`rounded-full px-2 py-0.5 text-[10.5px] ${active ? 'bg-white text-primary' : item.id === 'settings' ? 'bg-mint text-[#0b6f6b]' : 'bg-lavender text-primary'}`}>{badge}</span>}
                {active && <span className="absolute" />}
              </button>
            )
          })}
        </nav>

        {/* التذييل: مسار البيانات والإصدار */}
        <div className="rounded-2xl border border-line bg-white px-4 py-3 shadow-card">
          <button onClick={() => window.api.app.openDataDir()} title={info.data?.dataDir} className="flex w-full items-center gap-2 rounded-lg bg-paper px-2.5 py-1.5 text-[11px] font-bold text-ink hover:bg-lavender">
            <FolderOpen size={13} className="shrink-0 text-primary" /><span className="truncate font-mono" dir="ltr">{info.data?.dataDir ?? '…'}</span>
          </button>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
            <span>v{info.data?.version ?? '…'} (محلي بالكامل)</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-success" /> متصل محليًا</span>
          </div>
          {updateReady && <button onClick={() => onNavigate('settings')} className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-mint py-1.5 text-[11.5px] font-bold text-[#0b6f6b]"><Download size={13} /> تحديث جديد متاح</button>}
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto rounded-2xl">
        <div className="mx-auto max-w-[1180px] px-2 py-2">{children}</div>
      </main>
    </div>
  )
}


