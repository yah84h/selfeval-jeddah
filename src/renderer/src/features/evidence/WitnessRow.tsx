import { useState, type DragEvent } from 'react'
import { CheckCircle2, Circle, FileCheck2, Pencil, Plus, RotateCcw, Sparkles, Trash2, Upload } from 'lucide-react'
import type { WitnessProgress } from '@shared/types'
import { Button, IconButton } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Card'
import { FileItem } from './FileItem'
import type { useEvidenceActions } from './useEvidenceActions'

type Actions = ReturnType<typeof useEvidenceActions>

export function WitnessRow({ indicatorCode, witness, actions, onPreview }: { indicatorCode: string; witness: WitnessProgress; actions: Actions; onPreview: (id: number) => void }) {
  const [dragging, setDragging] = useState(false)
  const key = `${indicatorCode}::${witness.name}`
  const busy = actions.busyKey === key
  const renamed = witness.displayName !== witness.name

  const onDrop = (e: DragEvent): void => {
    e.preventDefault(); setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) void actions.drop(indicatorCode, witness.name, files)
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
      className={`rounded-xl border border-line bg-paper p-3 transition ${dragging ? 'drop-active' : ''} ${witness.complete ? 'border-teal/40' : ''}`}
    >
      <div className="flex items-center gap-2">
        {witness.complete ? <CheckCircle2 size={18} className="shrink-0 text-teal" /> : <Circle size={18} className="shrink-0 text-line" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-ink">{witness.displayName}</span>
            {witness.isCustom && <Badge tone="primary"><Sparkles size={11} /> شاهد مخصص</Badge>}
            {renamed && <span className="text-[11px] text-muted" title="المسمى الأصلي في الدليل">(الأصل: {witness.name})</span>}
          </div>
          <div className="text-[11px] text-muted">{witness.files.length ? `${witness.files.length} ملف(ات)` : 'لم يُرفع شيء بعد — اسحب الملفات هنا أو اضغط رفع'}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="sm" variant="teal" loading={busy} onClick={() => actions.pick(indicatorCode, witness.name)}><Upload size={14} /> رفع شاهد</Button>
          <IconButton title="تعديل المسمى" onClick={() => actions.rename(indicatorCode, witness)}><Pencil size={15} /></IconButton>
          {renamed && <IconButton title="إعادة المسمى الأصلي" onClick={() => actions.resetName(indicatorCode, witness)}><RotateCcw size={15} /></IconButton>}
          {witness.isCustom
            ? <IconButton title="حذف الشاهد المخصص" variant="danger" onClick={() => actions.removeCustom(witness)}><Trash2 size={15} /></IconButton>
            : witness.files.length > 0 && <IconButton title="حذف كل ملفات هذا الشاهد" variant="danger" onClick={() => actions.removeWitnessFiles(indicatorCode, witness)}><Trash2 size={15} /></IconButton>}
        </div>
      </div>
      {witness.files.length > 0 && (
        <div className="mt-2 space-y-1.5 pr-7">
          {witness.files.map(file => (
            <FileItem key={file.id} file={file} busy={actions.busyKey === `file-${file.id}`}
              onPreview={() => onPreview(file.id)} onOpen={() => window.api.evidence.open(file.id)} onShow={() => window.api.evidence.showInFolder(file.id)}
              onNote={() => actions.setNote(file.id, file.note)} onRemove={() => actions.removeFile(file.id, file.fileName)} />
          ))}
        </div>
      )}
    </div>
  )
}

export function AddCustomWitnessButton({ indicatorCode, actions }: { indicatorCode: string; actions: Actions }) {
  return (
    <button onClick={() => actions.addCustom(indicatorCode)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary-line py-2.5 text-sm font-bold text-primary hover:bg-primary-soft">
      <Plus size={15} /> إضافة شاهد جديد غير مدرج
    </button>
  )
}

export function WitnessHeader({ count, completed }: { count: number; completed: number }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-sm font-extrabold text-ink"><FileCheck2 size={15} className="text-blue" /> الوثائق المطلوبة لإثبات تحقق المؤشر</span>
      <span className="text-xs font-bold text-muted">{completed}/{count} شواهد</span>
    </div>
  )
}
