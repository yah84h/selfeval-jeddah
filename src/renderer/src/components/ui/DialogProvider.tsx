// بديل آمن لـ window.confirm / window.prompt: حوارات داخل التطبيق تعيد Promise
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, Pencil } from 'lucide-react'
import { Dialog } from './Dialog'
import { Button } from './Button'
import { inputClass } from './Card'

type ConfirmOptions = { title: string; message: ReactNode; confirmText?: string; cancelText?: string; danger?: boolean }
type PromptOptions = { title: string; label: string; defaultValue?: string; placeholder?: string; confirmText?: string; validate?: (v: string) => string | null }

type Ctx = {
  confirm(options: ConfirmOptions): Promise<boolean>
  prompt(options: PromptOptions): Promise<string | null>
}

const DialogContext = createContext<Ctx | null>(null)

export function useDialogs(): Ctx {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('DialogProvider مفقود')
  return ctx
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null)
  const [promptState, setPromptState] = useState<PromptOptions | null>(null)
  const [promptValue, setPromptValue] = useState('')
  const [promptError, setPromptError] = useState<string | null>(null)
  const confirmResolver = useRef<(v: boolean) => void>(() => {})
  const promptResolver = useRef<(v: string | null) => void>(() => {})

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>(resolve => { confirmResolver.current = resolve; setConfirmState(options) }), [])
  const prompt = useCallback((options: PromptOptions) => new Promise<string | null>(resolve => { promptResolver.current = resolve; setPromptValue(options.defaultValue ?? ''); setPromptError(null); setPromptState(options) }), [])

  const closeConfirm = (value: boolean): void => { setConfirmState(null); confirmResolver.current(value) }
  const closePrompt = (value: string | null): void => {
    if (value !== null && promptState?.validate) {
      const err = promptState.validate(value)
      if (err) { setPromptError(err); return }
    }
    setPromptState(null); promptResolver.current(value)
  }

  const value = useMemo(() => ({ confirm, prompt }), [confirm, prompt])

  return (
    <DialogContext.Provider value={value}>
      {children}
      <Dialog open={Boolean(confirmState)} onClose={() => closeConfirm(false)} title={confirmState?.title ?? ''} size="sm"
        icon={<AlertTriangle size={18} className={confirmState?.danger ? 'text-danger' : ''} />}
        footer={<>
          <Button variant="outline" onClick={() => closeConfirm(false)}>{confirmState?.cancelText ?? 'إلغاء'}</Button>
          <Button variant={confirmState?.danger ? 'danger' : 'primary'} onClick={() => closeConfirm(true)} autoFocus>{confirmState?.confirmText ?? 'تأكيد'}</Button>
        </>}>
        <div className="text-sm leading-7 text-ink">{confirmState?.message}</div>
      </Dialog>
      <Dialog open={Boolean(promptState)} onClose={() => closePrompt(null)} title={promptState?.title ?? ''} size="sm" icon={<Pencil size={18} />}
        footer={<>
          <Button variant="outline" onClick={() => closePrompt(null)}>إلغاء</Button>
          <Button onClick={() => closePrompt(promptValue.trim())}>{promptState?.confirmText ?? 'حفظ'}</Button>
        </>}>
        <form onSubmit={e => { e.preventDefault(); closePrompt(promptValue.trim()) }}>
          <label className="mb-1.5 block text-sm font-bold">{promptState?.label}</label>
          <input autoFocus className={inputClass} value={promptValue} placeholder={promptState?.placeholder} onChange={e => { setPromptValue(e.target.value); setPromptError(null) }} />
          {promptError && <p className="mt-2 text-xs font-semibold text-danger">{promptError}</p>}
        </form>
      </Dialog>
    </DialogContext.Provider>
  )
}
