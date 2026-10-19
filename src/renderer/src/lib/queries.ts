// استعلامات react-query + إعادة التحميل تلقائيًا عند أي تغيير في البيانات (حدث من main)
import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'

export const keys = {
  info: ['app', 'info'] as const,
  school: ['school'] as const,
  progress: ['progress'] as const,
  settings: ['settings'] as const,
  backups: ['backups'] as const,
  trash: ['trash'] as const,
  activity: ['activity'] as const,
  updateStatus: ['update'] as const
}

export const useAppInfo = () => useQuery({ queryKey: keys.info, queryFn: api.app.info, staleTime: Infinity })
export const useSchool = () => useQuery({ queryKey: keys.school, queryFn: api.school.get })
export const useProgress = () => useQuery({ queryKey: keys.progress, queryFn: api.progress.get })
export const useSettings = () => useQuery({ queryKey: keys.settings, queryFn: api.settings.get })
export const useBackups = () => useQuery({ queryKey: keys.backups, queryFn: api.backup.list })
export const useTrash = () => useQuery({ queryKey: keys.trash, queryFn: api.evidence.listTrash })
export const useActivity = () => useQuery({ queryKey: keys.activity, queryFn: api.activity.recent })
export const useUpdateStatus = () => useQuery({ queryKey: keys.updateStatus, queryFn: api.update.status })

/** يربط أحداث main بإبطال الاستعلامات المناسبة */
export function useLiveData(): void {
  const qc = useQueryClient()
  useEffect(() => {
    const offData = api.onDataChanged(() => {
      void qc.invalidateQueries({ queryKey: keys.progress })
      void qc.invalidateQueries({ queryKey: keys.school })
      void qc.invalidateQueries({ queryKey: keys.trash })
      void qc.invalidateQueries({ queryKey: keys.backups })
      void qc.invalidateQueries({ queryKey: keys.activity })
    })
    const offUpdate = api.onUpdateStatus(status => qc.setQueryData(keys.updateStatus, status))
    return () => { offData(); offUpdate() }
  }, [qc])
}
