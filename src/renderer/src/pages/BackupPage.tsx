import { useState } from 'react'
import { Database, Download, FolderOpen, HardDriveDownload, RefreshCw, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import type { BackupInfo, BackupManifest, RestoreMode } from '@shared/types'
import { useBackups, useSettings } from '@/lib/queries'
import { api, errorMessage } from '@/lib/api'
import { useDialogs } from '@/components/ui/DialogProvider'
import { Badge, Card, EmptyState, SectionHeading } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { formatDate, formatSize } from '@/lib/format'

const kindLabel: Record<BackupInfo['kind'], { text: string; tone: 'primary' | 'teal' | 'warn' | 'default' }> = {
  manual: { text: 'يدوية', tone: 'primary' }, auto: { text: 'تلقائية', tone: 'teal' }, 'pre-update': { text: 'قبل التحديث', tone: 'warn' }, 'pre-restore': { text: 'قبل الاستعادة', tone: 'warn' }, external: { text: 'خارجية', tone: 'default' }
}

export function BackupPage() {
  const backups = useBackups()
  const settings = useSettings()
  const { confirm } = useDialogs()
  const [busy, setBusy] = useState<string | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<{ path: string; manifest: BackupManifest } | null>(null)

  const act = async (key: string, fn: () => Promise<void>): Promise<void> => { setBusy(key); try { await fn() } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(null); void backups.refetch() } }

  const openRestore = (path: string): Promise<void> => act('inspect', async () => { setRestoreTarget({ path, manifest: await api.backup.inspect(path) }) })
  const pickAndRestore = (): Promise<void> => act('pick', async () => { const p = await api.backup.pickFile(); if (p) await openRestore(p) })

  const doRestore = async (mode: RestoreMode): Promise<void> => {
    if (!restoreTarget) return
    const ok = await confirm({
      title: mode === 'replace' ? 'استبدال كل البيانات' : 'دمج النسخة مع البيانات الحالية',
      message: mode === 'replace'
        ? <>ستُستبدل <b>كل</b> بيانات المدرسة وملفاتها الحالية بمحتوى النسخة. ستُؤخذ نسخة «قبل الاستعادة» تلقائيًا أولًا.</>
        : <>ستُضاف الملفات والشواهد الموجودة في النسخة وغير الموجودة حاليًا، دون حذف أو تعديل أي شيء موجود.</>,
      confirmText: mode === 'replace' ? 'استبدال' : 'دمج', danger: mode === 'replace'
    })
    if (!ok) return
    const target = restoreTarget
    setRestoreTarget(null)
    await act('restore', async () => {
      const r = await api.backup.restore({ path: target.path, mode })
      toast.success(mode === 'replace' ? `تمت الاستعادة: ${r.addedEvidence} ملف` : `تم الدمج: أُضيف ${r.addedEvidence} ملف، تُخطّي ${r.skippedEvidence} مكرر`)
    })
  }

  return (
    <>
      <SectionHeading eyebrow="الأمان والموثوقية" title="النسخ الاحتياطي والاستعادة" description="نسخة واحدة = قاعدة البيانات + كل ملفات الشواهد في ملف zip. احتفظ بنسخة خارج الجهاز (ذاكرة خارجية أو سحابة المدرسة)."
        action={<>
          <Button variant="outline" onClick={() => api.app.openBackupsDir()}><FolderOpen size={15} /> مجلد النسخ</Button>
          <Button variant="secondary" onClick={pickAndRestore} loading={busy === 'pick'}><Upload size={15} /> استعادة من ملف…</Button>
          <Button variant="outline" onClick={() => act('export', async () => { const b = await api.backup.exportTo(); if (b) toast.success('تم حفظ النسخة', { description: b.path }) })} loading={busy === 'export'}><HardDriveDownload size={15} /> حفظ نسخة في مكان آخر</Button>
          <Button variant="teal" onClick={() => act('create', async () => { const b = await api.backup.create(); toast.success(`تم إنشاء نسخة (${formatSize(b.size)})`) })} loading={busy === 'create'}><Database size={15} /> نسخة احتياطية الآن</Button>
        </>} />

      <Card className="mb-5 flex items-center gap-4 border-teal/30 bg-teal-soft/40 p-4">
        <ShieldCheck size={26} className="shrink-0 text-teal" />
        <div className="flex-1 text-sm leading-6">
          <b>النسخ التلقائي اليومي {settings.data?.autoBackup ? 'مفعّل' : 'متوقف'}</b> — يُحتفظ بآخر {settings.data?.autoBackupKeep ?? 7} نسخ تلقائية. وتُؤخذ نسخة إضافية تلقائيًا قبل كل تحديث للبرنامج وقبل كل استعادة.
          <div className="text-xs text-muted">آخر نسخة تلقائية: {formatDate(settings.data?.lastAutoBackupAt)}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => backups.refetch()}><RefreshCw size={14} /> تحديث القائمة</Button>
      </Card>

      {backups.data?.length === 0 ? (
        <EmptyState icon={<Database size={22} />} title="لا توجد نسخ احتياطية بعد" description="أنشئ أول نسخة الآن. ستُنشأ نسخ تلقائية يوميًا بعد رفع أول شاهد." />
      ) : (
        <Card className="divide-y divide-line">
          {backups.data?.map(b => (
            <div key={b.path} className="flex items-center gap-3 px-5 py-3">
              <Database size={18} className="shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="truncate text-sm font-bold" dir="ltr">{b.fileName}</span><Badge tone={kindLabel[b.kind].tone}>{kindLabel[b.kind].text}</Badge></div>
                <div className="text-[11px] text-muted">{formatDate(b.createdAt)} · {formatSize(b.size)}</div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => openRestore(b.path)} loading={busy === 'inspect'}><Download size={14} /> استعادة</Button>
              <Button size="sm" variant="danger" onClick={async () => { if (await confirm({ title: 'حذف النسخة', message: <>حذف <b dir="ltr">{b.fileName}</b> نهائيًا؟</>, confirmText: 'حذف', danger: true })) await act('delete', () => api.backup.delete(b.path)) }}><Trash2 size={14} /></Button>
            </div>
          ))}
        </Card>
      )}

      <Dialog open={Boolean(restoreTarget)} onClose={() => setRestoreTarget(null)} title="استعادة نسخة احتياطية" icon={<Download size={18} />}>
        {restoreTarget && (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl bg-paper p-4 leading-7">
              <div><b>المدرسة:</b> {restoreTarget.manifest.schoolName || '—'}</div>
              <div><b>تاريخ النسخة:</b> {formatDate(restoreTarget.manifest.createdAt)}</div>
              <div><b>عدد الملفات:</b> {restoreTarget.manifest.evidenceCount} · <b>إصدار البرنامج:</b> {restoreTarget.manifest.appVersion}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => doRestore('merge')} className="rounded-xl border border-line p-4 text-right hover:border-teal hover:bg-teal-soft/50">
                <div className="font-extrabold text-teal">دمج (الأكثر أمانًا)</div>
                <p className="mt-1 text-xs leading-6 text-muted">يضيف ما ينقص فقط. لا يحذف ولا يعدّل شيئًا موجودًا حاليًا.</p>
              </button>
              <button onClick={() => doRestore('replace')} className="rounded-xl border border-line p-4 text-right hover:border-danger hover:bg-danger-soft/50">
                <div className="font-extrabold text-danger">استبدال كامل</div>
                <p className="mt-1 text-xs leading-6 text-muted">يعيد الجهاز إلى حالة النسخة تمامًا. تُؤخذ نسخة أمان أولًا.</p>
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  )
}
