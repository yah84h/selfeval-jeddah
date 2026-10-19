import { RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTrash } from '@/lib/queries'
import { api, errorMessage } from '@/lib/api'
import { useDialogs } from '@/components/ui/DialogProvider'
import { Card, EmptyState, SectionHeading } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatDate, formatSize } from '@/lib/format'
import { findIndicator } from '@shared/evaluationData'

export function TrashPage() {
  const trash = useTrash()
  const { confirm } = useDialogs()

  const restore = async (id: number): Promise<void> => { try { await api.evidence.restore(id); toast.success('تمت استعادة الملف إلى مكانه') } catch (e) { toast.error(errorMessage(e)) } }
  const purge = async (id: number, name: string): Promise<void> => {
    if (await confirm({ title: 'حذف نهائي', message: <>سيُحذف <b>{name}</b> نهائيًا من الجهاز ولا يمكن استعادته.</>, confirmText: 'حذف نهائيًا', danger: true })) {
      try { await api.evidence.purge(id); toast.success('حُذف الملف نهائيًا') } catch (e) { toast.error(errorMessage(e)) }
    }
  }
  const purgeAll = async (): Promise<void> => {
    if (!trash.data?.length) return
    if (await confirm({ title: 'إفراغ السلة', message: <>سيُحذف {trash.data.length} ملف(ات) نهائيًا.</>, confirmText: 'إفراغ السلة', danger: true })) {
      for (const f of trash.data) await api.evidence.purge(f.id)
      toast.success('أُفرغت السلة')
    }
  }

  return (
    <>
      <SectionHeading eyebrow="الحماية من الحذف الخاطئ" title="سلة المحذوفات" description="الملفات المحذوفة تبقى هنا 30 يومًا ثم تُحذف تلقائيًا. يمكنك استعادتها إلى مكانها الأصلي."
        action={trash.data?.length ? <Button variant="danger" onClick={purgeAll}><Trash2 size={15} /> إفراغ السلة</Button> : undefined} />
      {trash.data?.length === 0 ? (
        <EmptyState icon={<Trash2 size={22} />} title="السلة فارغة" description="لم تحذف أي ملف مؤخرًا." />
      ) : (
        <Card className="divide-y divide-line">
          {trash.data?.map(f => (
            <div key={f.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{f.fileName}</div>
                <div className="text-[11px] text-muted">{f.indicatorCode} · {f.witnessName} · {findIndicator(f.indicatorCode)?.text.slice(0, 60)}…</div>
                <div className="text-[11px] text-muted">{formatSize(f.fileSize)} · حُذف {formatDate(f.deletedAt)}</div>
              </div>
              <Button size="sm" variant="teal" onClick={() => restore(f.id)}><RotateCcw size={14} /> استعادة</Button>
              <Button size="sm" variant="danger" onClick={() => purge(f.id, f.fileName)}><Trash2 size={14} /> حذف نهائي</Button>
            </div>
          ))}
        </Card>
      )}
    </>
  )
}
