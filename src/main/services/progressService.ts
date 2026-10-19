// المصدر الوحيد لحساب الإنجاز (يستخدمه لوحة التحكم، شجرة المؤشرات، والتقرير)
import type { Database } from '../db/database'
import type { ProgressReport, WitnessProgress, Evidence, CustomWitness, WitnessLabel } from '@shared/types'
import { domains } from '@shared/evaluationData'

export function computeProgress(evidence: Evidence[], custom: CustomWitness[], labels: WitnessLabel[]): ProgressReport {
  const labelMap = new Map(labels.map(l => [`${l.indicatorCode}::${l.originalName}`, l.displayName]))
  const filesByKey = new Map<string, Evidence[]>()
  for (const file of evidence) {
    const key = `${file.indicatorCode}::${file.witnessName}`
    const bucket = filesByKey.get(key)
    if (bucket) bucket.push(file); else filesByKey.set(key, [file])
  }
  const customByCode = new Map<string, CustomWitness[]>()
  for (const c of custom) {
    const bucket = customByCode.get(c.indicatorCode)
    if (bucket) bucket.push(c); else customByCode.set(c.indicatorCode, [c])
  }

  const missing: ProgressReport['missing'] = []
  let total = 0
  let completed = 0

  const report = domains.map(domain => {
    let domainTotal = 0
    let domainCompleted = 0
    const criteria = domain.criteria.map(criterion => {
      let criterionTotal = 0
      let criterionCompleted = 0
      const indicators = criterion.indicators.map(indicator => {
        const makeWitness = (name: string, isCustom: boolean, customId?: number): WitnessProgress => {
          const files = filesByKey.get(`${indicator.code}::${name}`) ?? []
          const complete = files.length > 0
          if (!complete) missing.push({ indicatorCode: indicator.code, indicatorText: indicator.text, witnessName: labelMap.get(`${indicator.code}::${name}`) ?? name, domainId: domain.id })
          return { name, displayName: labelMap.get(`${indicator.code}::${name}`) ?? name, isCustom, customId, files, complete }
        }
        const witnesses = [
          ...indicator.requiredDocuments.map(name => makeWitness(name, false)),
          ...(customByCode.get(indicator.code) ?? []).map(c => makeWitness(c.name, true, c.id))
        ]
        const done = witnesses.filter(w => w.complete).length
        criterionTotal += witnesses.length
        criterionCompleted += done
        return { code: indicator.code, text: indicator.text, witnesses, completed: done, total: witnesses.length }
      })
      domainTotal += criterionTotal
      domainCompleted += criterionCompleted
      return { id: criterion.id, name: criterion.name, indicators, completed: criterionCompleted, total: criterionTotal }
    })
    total += domainTotal
    completed += domainCompleted
    return { id: domain.id, name: domain.name, icon: domain.icon, criteria, completed: domainCompleted, total: domainTotal }
  })

  return {
    domains: report,
    total,
    completed,
    percent: total ? Math.round((completed / total) * 100) : 0,
    uploadedFiles: evidence.length,
    missing
  }
}

export function createProgressService(
  _db: Database,
  deps: { evidence: () => Evidence[]; custom: () => CustomWitness[]; labels: () => WitnessLabel[] }
) {
  return {
    get(): ProgressReport { return computeProgress(deps.evidence(), deps.custom(), deps.labels()) }
  }
}
