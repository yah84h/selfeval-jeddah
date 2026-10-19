export type PageId = 'dashboard' | 'standards' | 'report' | 'trash' | 'backup' | 'settings' | 'about'

export type NavTarget = { page: PageId; domainId?: number; indicatorCode?: string }
