import { Eye, ExternalLink, FolderOpen, MessageSquareText, Trash2 } from 'lucide-react'
import type { Evidence } from '@shared/types'
import { fileKind, formatDate, formatSize, isPreviewable } from '@/lib/format'
import { IconButton } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Card'

export const kindBadge: Record<ReturnType<typeof fileKind>, { label: string; cls: string }> = {
  pdf: { label: 'PDF', cls: 'bg-danger-soft text-danger' },
  word: { label: 'DOC', cls: 'bg-blue-soft text-blue' },
  excel: { label: 'XLS', cls: 'bg-success-soft text-success' },
  ppt: { label: 'PPT', cls: 'bg-warn-soft text-warn' },
  image: { label: 'IMG', cls: 'bg-mint text-[#0b6f6b]' },
  archive: { label: 'ZIP', cls: 'bg-paper text-muted' },
  other: { label: 'FILE', cls: 'bg-paper text-muted' }
}

export function FileItem({ file, busy, onPreview, onOpen, onShow, onNote, onRemove }: {
  file: Evidence; busy: boolean
  onPreview: () => void; onOpen: () => void; onShow: () => void; onNote: () => void; onRemove: () => void
}) {
  const previewable = isPreviewable(file.mimeType, file.fileName)
  const badge = kindBadge[fileKind(file.fileName)]
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2 ${busy ? 'opacity-60' : ''}`}>
      <span className={`grid h-9 w-11 shrink-0 place-items-center rounded-lg font-mono text-[10.5px] font-extrabold ${badge.cls}`}>{badge.label}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-bold text-ink" title={file.fileName}>{file.fileName}</div>
        <div className="truncate text-[11px] text-muted">{formatSize(file.fileSize)} · تم التوثيق محليًا {formatDate(file.createdAt)}{file.note && <span className="text-primary"> · {file.note}</span>}</div>
      </div>
      <Pill tone="mint">مطابق</Pill>
      <div className="flex shrink-0 items-center">
        {previewable
          ? <IconButton title="معاينة داخل التطبيق" onClick={onPreview} disabled={busy}><Eye size={16} /></IconButton>
          : <IconButton title="فتح بالبرنامج الافتراضي" onClick={onOpen} disabled={busy}><ExternalLink size={16} /></IconButton>}
        <IconButton title="إظهار في المجلد" onClick={onShow} disabled={busy}><FolderOpen size={16} /></IconButton>
        <IconButton title="ملاحظة" onClick={onNote} disabled={busy}><MessageSquareText size={16} /></IconButton>
        <IconButton title="حذف (إلى السلة)" variant="danger" onClick={onRemove} disabled={busy}><Trash2 size={16} /></IconButton>
      </div>
    </div>
  )
}
