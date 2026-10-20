// نموذج بيانات التقرير المشترك بين الشاشة وملف PDF
import type { ProgressReport, School, Evidence } from '@shared/types'

export type ReportOptions = {
  scope: 'all' | 'missing'
  showExcludedReasons: boolean
  includeFileNames: boolean
  includeEvidenceLog: boolean
  includeSignatures: boolean
}

export const defaultReportOptions: ReportOptions = { scope: 'all', showExcludedReasons: true, includeFileNames: true, includeEvidenceLog: true, includeSignatures: true }

export type EvidenceLogRow = { code: string; criterion: string; witness: string; file: Evidence }

export function buildEvidenceLog(p: ProgressReport, limit = 60): EvidenceLogRow[] {
  const rows: EvidenceLogRow[] = []
  for (const d of p.domains) for (const c of d.criteria) for (const i of c.indicators) {
    if (i.notApplicable) continue
    for (const w of i.witnesses) for (const f of w.files) rows.push({ code: i.displayCode, criterion: c.id, witness: w.displayName, file: f })
  }
  return rows.sort((a, b) => b.file.createdAt.localeCompare(a.file.createdAt)).slice(0, limit)
}

export function reportRef(school: School | null, date = new Date()): string {
  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, '0'), d = String(date.getDate()).padStart(2, '0')
  return `JED-${school?.ministryNumber || '0000'}-EV-${y}${m}${d}`
}

export function readinessLabel(percent: number): string {
  if (percent >= 90) return 'مستوى الجاهزية التامة للتقويم الخارجي'
  if (percent >= 70) return 'مستوى الانطلاق والجاهزية المتقدمة'
  if (percent >= 40) return 'مستوى التأسيس — يحتاج استكمال'
  return 'مستوى البداية — يتطلب خطة عاجلة'
}

export const hijriDate = (date = new Date()): string => new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { dateStyle: 'long', numberingSystem: 'latn' }).format(date)
export const gregDate = (date = new Date()): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
