import { useEffect, useState } from 'react'
import { Eye, ExternalLink } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { api, errorMessage } from '@/lib/api'
import { toast } from 'sonner'

export function PreviewDialog({ fileId, fileName, onClose }: { fileId: number | null; fileName: string; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    setUrl(null)
    if (fileId === null) return
    api.evidence.previewUrl(fileId).then(setUrl).catch(error => { toast.error(errorMessage(error)); onClose() })
  }, [fileId, onClose])

  const isImage = /\.(png|jpe?g|webp|gif|bmp)$/i.test(fileName)
  return (
    <Dialog open={fileId !== null} onClose={onClose} title={`معاينة: ${fileName}`} icon={<Eye size={18} />} size="xl"
      footer={<Button variant="outline" onClick={() => fileId !== null && api.evidence.open(fileId)}><ExternalLink size={15} /> فتح بالبرنامج الافتراضي</Button>}>
      <div className="h-[70vh] overflow-hidden rounded-xl border border-line bg-paper">
        {url && (isImage
          ? <div className="grid h-full place-items-center overflow-auto p-4"><img src={url} alt={fileName} className="max-h-full max-w-full rounded-lg object-contain" /></div>
          : <iframe title={fileName} src={url} className="h-full w-full border-0" />)}
      </div>
    </Dialog>
  )
}
