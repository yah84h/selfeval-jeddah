import { useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { inputClass } from '@/components/ui/Card'
import { Logo } from '@/components/Logo'

export function LockPage({ onUnlocked }: { onUnlocked: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setBusy(true)
    const ok = await api.pin.verify(pin)
    setBusy(false)
    if (ok) onUnlocked(); else { setError('رمز غير صحيح'); setPin('') }
  }

  return (
    <div className="grid h-full place-items-center bg-gradient-to-br from-primary-soft to-paper">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 text-center shadow-card">
        <div className="mx-auto w-fit"><Logo size={56} /></div>
        <h1 className="mt-4 text-xl font-extrabold">التطبيق مقفل</h1>
        <p className="mt-1 text-sm text-muted">أدخل رمز القفل للوصول إلى ملف المدرسة</p>
        <input autoFocus type="password" inputMode="numeric" className={`${inputClass} mt-5 text-center text-xl tracking-[0.5em]`} value={pin} onChange={e => { setPin(e.target.value); setError('') }} maxLength={8} />
        {error && <p className="mt-2 text-sm font-bold text-danger">{error}</p>}
        <Button type="submit" className="mt-4 w-full" loading={busy}><LockKeyhole size={16} /> فتح</Button>
      </form>
    </div>
  )
}
