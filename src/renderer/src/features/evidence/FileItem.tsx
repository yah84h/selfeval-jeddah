import { Eye, ExternalLink, FolderOpen, MessageSquareText, Trash2, FileText, FileImage, FileSpreadsheet, Presentation, FileArchive, File } from 'lucide-react'
import type { Evidence } from '@shared/types'
import { fileKind, formatDate, formatSize, isPreviewable } from '@/lib/format'
import { IconButton } from '@/components/ui/Button'

const icons = {
  pdf: <FileText size={18} className="text-danger" />,
  word: <FileText size={18} className="text-blue" />,
  excel: <FileSpreadsheet size={18} className="text-success" />,
  ppt: <Presentation size={18} className="text-warn" />,
  image: <FileImage size={18} className="text-teal" />,
  archive: <FileArchive size={18} className="text-muted" />,
  other: <File size={18} className="text-muted" />
}

export function FileItem({ file, busy, onPreview, onOpen, onShow, onNote, onRemove }: {
  file: Evidence; busy: boolean
  onPreview: () => void; onOpen: () => void; onShow: () => void; onNote: () => void; onRemove: () => void
}) {
  const previewable = isPreviewable(file.mimeType, file.fileName)
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2 ${busy ? 'opacity-60' : ''}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-paper">{icons[fileKind(file.fileName)]}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-ink" title={file.fileName}>{file.fileName}</div>
        <div className="truncate text-[11px] text-muted">{formatSize(file.fileSize)} · {formatDate(file.createdAt)}{file.note && <span className="text-primary"> · {file.note}</span>}</div>
      </div>
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
