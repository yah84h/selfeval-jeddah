export function formatSize(size: number): string {
  if (size < 1024) return `${size} بايت`
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} كيلوبايت`
  return `${(size / 1024 / 1024).toFixed(1)} ميجابايت`
}

const dateFmt = new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' })
const dateOnlyFmt = new Intl.DateTimeFormat('ar-SA', { dateStyle: 'long', numberingSystem: 'latn' })

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d)
}

export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : dateOnlyFmt.format(d)
}

export function isPreviewable(mimeType: string, fileName: string): boolean {
  return /^(application\/pdf|image\/|text\/plain)/.test(mimeType) || /\.(pdf|png|jpe?g|webp|gif|bmp|txt)$/i.test(fileName)
}

export function fileKind(fileName: string): 'pdf' | 'word' | 'excel' | 'ppt' | 'image' | 'archive' | 'other' {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'pdf'
  if (['doc', 'docx'].includes(ext)) return 'word'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel'
  if (['ppt', 'pptx'].includes(ext)) return 'ppt'
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext)) return 'image'
  if (['zip', 'rar'].includes(ext)) return 'archive'
  return 'other'
}
