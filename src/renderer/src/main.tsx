import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import App from './App'
import { DialogProvider } from './components/ui/DialogProvider'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 5_000, refetchOnWindowFocus: false } }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <DialogProvider>
        <App />
        <Toaster position="bottom-left" dir="rtl" richColors closeButton toastOptions={{ style: { fontFamily: 'Tajawal, sans-serif' } }} />
      </DialogProvider>
    </QueryClientProvider>
  </StrictMode>
)
