import { useState, type DragEvent } from 'react'
import { Ban, CheckCircle2, EyeOff, FileCheck2, FileUp, Monitor, Pencil, Plus, RotateCcw, Sparkles, Trash2, Upload, Eye } from 'lucide-react'
import type { WitnessProgress } from '@shared/types'
import { Button, IconButton } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Card'
import { FileItem } from './FileItem'
import type { useEvidenceActions } from './useEvidenceActions'

type Actions = ReturnType<typeof useEvidenceActions>

export function WitnessRow({ indicatorCode, witness, actions, onPreview }: { indicatorCode: string; witness: WitnessProgress; actions: Actions; onPreview: (id: number) => void }) {
  const [dragging, setDragging] = useState(false)
  const key = `${indicatorCode}::${witness.name}`
  const busy = actions.busyKey === key
  const renamed = witness.displayName !== witness.name

  if (witness.excluded) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-line bg-white/60 px-3 py-2 opacity-80">
        <EyeOff size={16} className="shrink-0 text-muted" />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-bold text-muted line-through decoration-muted/50">{witness.displayName}</span>
          <Pill tone="warn" className="mr-2">لا ينطبق</Pill>
          {witness.excludeReason && <span className="mr-2 text-[11px] text-muted">— {witness.excludeReason}</span>}
          {witness.files.length > 0 && <span className="mr-2 text-[11px] text-muted">({witness.files.length} ملف محفوظ)</span>}
        </div>
        <Button size="sm" variant="outline" loading={busy} onClick={() => actions.include(indicatorCode, witness)}><Eye size={14} /> تفعيل</Button>
      </div>
    )
  }

  const onDrop = (e: DragEvent): void => {
    e.preventDefault(); setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) void actions.drop(indicatorCode, witness.name, files)
  }

  return (
    <div onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
      className={`rounded-xl border bg-white p-3 transition ${dragging ? 'drop-active' : ''} ${witness.complete ? 'border-line' : 'border-danger/25'}`}>
      <div className="flex items-center gap-2">
        {witness.complete ? <CheckCircle2 size={18} className="shrink-0 text-teal" /> : <Ban size={18} className="shrink-0 text-danger/70" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-bold ${witness.complete ? 'text-ink' : 'text-danger'}`}>{witness.complete ? witness.displayName : `الشاهد المتبقي: ${witness.displayName}`}</span>
            {!witness.complete && <Pill tone="danger">مفقود</Pill>}
            {witness.isCustom && <Pill tone="lavender"><Sparkles size={11} /> شاهد مخصص</Pill>}
            {renamed && <span className="text-[11px] text-muted" title="المسمى الأصلي في الدليل">(الأصل: {witness.name})</span>}
          </div>
          {witness.complete && <div className="text-[11px] text-muted">{witness.files.length} ملف(ات) موثقة</div>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {witness.complete && <Button size="sm" variant="teal" loading={busy} onClick={() => actions.pick(indicatorCode, witness.name)}><Upload size={14} /> رفع شاهد</Button>}
          <IconButton title="تعديل المسمى" onClick={() => actions.rename(indicatorCode, witness)}><Pencil size={15} /></IconButton>
          {renamed && <IconButton title="إعادة المسمى الأصلي" onClick={() => actions.resetName(indicatorCode, witness)}><RotateCcw size={15} /></IconButton>}
          {witness.isCustom
            ? <IconButton title="حذف الشاهد المخصص" variant="danger" onClick={() => actions.removeCustom(witness)}><Trash2 size={15} /></IconButton>
            : <>
                {witness.complete && <IconButton title="لا ينطبق على المدرسة — استبعاد من الحساب" onClick={() => actions.exclude(indicatorCode, witness)}><EyeOff size={15} /></IconButton>}
                {witness.files.length > 0 && <IconButton title="حذف كل ملفات هذا الشاهد" variant="danger" onClick={() => actions.removeWitnessFiles(indicatorCode, witness)}><Trash2 size={15} /></IconButton>}
              </>}
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

      {!witness.complete && (
        <div className="mt-2 rounded-xl border border-dashed border-primary-line bg-paper/70 px-4 py-5 text-center">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-lavender text-primary"><FileUp size={20} /></div>
          <div className="mt-2 text-sm font-extrabold text-ink">اسحب الملف التوثيقي وأفلته هنا</div>
          <div className="text-[11px] text-muted">يدعم PDF وWord وExcel وPowerPoint والصور حتى 50 ميجابايت (يتم التخزين في المسار المحلي مباشرة)</div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <Button size="sm" loading={busy} onClick={() => actions.pick(indicatorCode, witness.name)}><Monitor size={14} /> استعراض من الحاسب</Button>
            {!witness.isCustom && <Button size="sm" variant="outline" onClick={() => actions.exclude(indicatorCode, witness)}><EyeOff size={14} /> تحديد كـ«لا ينطبق» مع إرفاق التبرير</Button>}
          </div>
        </div>
      )}
    </div>
  )
}

export function AddCustomWitnessButton({ indicatorCode, actions }: { indicatorCode: string; actions: Actions }) {
  return (
    <button onClick={() => actions.addCustom(indicatorCode)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary-line py-2.5 text-sm font-bold text-primary hover:bg-lavender">
      <Plus size={15} /> إضافة شاهد جديد غير مدرج
    </button>
  )
}

export function WitnessHeader({ indicatorCode, count, completed, excludedCount, requiredCount, actions }: { indicatorCode: string; count: number; completed: number; excludedCount: number; requiredCount: number; actions: Actions }) {
  const allExcluded = requiredCount > 0 && excludedCount === requiredCount
  const busy = actions.busyKey === `ind-${indicatorCode}`
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-[13px] font-extrabold text-ink"><FileCheck2 size={15} className="text-blue" /> الشواهد المطلوبة لإثبات تحقق المؤشر</span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-muted">{completed}/{count} شواهد{excludedCount > 0 && <span className="text-warn"> · {excludedCount} لا ينطبق</span>}</span>
        {allExcluded
          ? <Button size="sm" variant="outline" loading={busy} onClick={() => actions.includeIndicator(indicatorCode)}><Eye size={13} /> تفعيل المؤشر</Button>
          : <Button size="sm" variant="ghost" loading={busy} onClick={() => actions.excludeIndicator(indicatorCode)} title="استبعاد كل شواهد هذا المؤشر"><EyeOff size={13} /> المؤشر لا ينطبق</Button>}
      </div>
    </div>
  )
}
