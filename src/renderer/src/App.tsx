import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Shell } from './app/Shell'
import type { NavTarget, PageId } from './app/navigation'
import { useLiveData, useSchool, useSettings } from './lib/queries'
import { DashboardPage } from './pages/DashboardPage'
import { StandardsPage } from './pages/StandardsPage'
import { ReportPage } from './pages/ReportPage'
import { TrashPage } from './pages/TrashPage'
import { BackupPage } from './pages/BackupPage'
import { SettingsPage } from './pages/SettingsPage'
import { AboutPage } from './pages/AboutPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { LockPage } from './pages/LockPage'

export default function App() {
  useLiveData()
  const school = useSchool()
  const settings = useSettings()
  const [unlocked, setUnlocked] = useState(false)
  const [page, setPage] = useState<PageId>('dashboard')
  const [standardsTarget, setStandardsTarget] = useState<{ domainId?: number; indicatorCode?: string }>({})

  useEffect(() => { if (settings.data && !settings.data.pinEnabled) setUnlocked(true) }, [settings.data])

  const navigate = (target: PageId | NavTarget): void => {
    if (typeof target === 'string') { setPage(target); return }
    setStandardsTarget({ domainId: target.domainId, indicatorCode: target.indicatorCode })
    setPage(target.page)
  }

  if (school.isLoading || settings.isLoading) {
    return <div className="grid h-full place-items-center text-muted"><Loader2 className="animate-spin" /></div>
  }
  if (settings.data?.pinEnabled && !unlocked) return <LockPage onUnlocked={() => setUnlocked(true)} />
  if (!school.data) return <OnboardingPage />

  return (
    <Shell page={page} onNavigate={navigate}>
      {page === 'dashboard' && <DashboardPage onNavigate={navigate} />}
      {page === 'standards' && <StandardsPage key={`${standardsTarget.domainId ?? ''}-${standardsTarget.indicatorCode ?? ''}`} initialDomainId={standardsTarget.domainId} initialIndicatorCode={standardsTarget.indicatorCode} />}
      {page === 'report' && <ReportPage />}
      {page === 'trash' && <TrashPage />}
      {page === 'backup' && <BackupPage />}
      {page === 'settings' && <SettingsPage />}
      {page === 'about' && <AboutPage onNavigate={navigate} />}
    </Shell>
  )
}
