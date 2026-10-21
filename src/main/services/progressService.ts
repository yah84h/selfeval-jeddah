// المصدر الوحيد لحساب الإنجاز (يستخدمه لوحة التحكم، شجرة المؤشرات، والتقرير)
import type { Database } from "../db/database";
import type {
  ProgressReport,
  WitnessProgress,
  Evidence,
  CustomWitness,
  WitnessLabel,
  WitnessExclusion,
} from "@shared/types";
import { domains } from "@shared/evaluationData";

export function computeProgress(
  evidence: Evidence[],
  custom: CustomWitness[],
  labels: WitnessLabel[],
  exclusions: WitnessExclusion[] = [],
): ProgressReport {
  const exclusionMap = new Map(
    exclusions.map((e) => [`${e.indicatorCode}::${e.originalName}`, e.reason]),
  );
  const labelMap = new Map(
    labels.map((l) => [`${l.indicatorCode}::${l.originalName}`, l.displayName]),
  );
  const filesByKey = new Map<string, Evidence[]>();
  for (const file of evidence) {
    const key = `${file.indicatorCode}::${file.witnessName}`;
    const bucket = filesByKey.get(key);
    if (bucket) bucket.push(file);
    else filesByKey.set(key, [file]);
  }
  const customByCode = new Map<string, CustomWitness[]>();
  for (const c of custom) {
    const bucket = customByCode.get(c.indicatorCode);
    if (bucket) bucket.push(c);
    else customByCode.set(c.indicatorCode, [c]);
  }

  const missing: ProgressReport["missing"] = [];
  // الأرقام الرسمية للمؤشرات تبقى كما في الدليل حتى عند استبعاد مؤشرات (لا إعادة ترقيم)
  let total = 0;
  let completed = 0;

  const report = domains.map((domain) => {
    let domainTotal = 0;
    let domainCompleted = 0;
    const criteria = domain.criteria.map((criterion) => {
      let criterionTotal = 0;
      let criterionCompleted = 0;
      const indicators = criterion.indicators.map((indicator) => {
        const requiredExcluded = indicator.requiredDocuments.filter((name) =>
          exclusionMap.has(`${indicator.code}::${name}`),
        ).length;
        const notApplicable =
          indicator.requiredDocuments.length > 0 &&
          requiredExcluded === indicator.requiredDocuments.length;
        const displayCode = indicator.code;
        const makeWitness = (
          name: string,
          isCustom: boolean,
          customId?: number,
        ): WitnessProgress => {
          const files = filesByKey.get(`${indicator.code}::${name}`) ?? [];
          const complete = files.length > 0;
          const key = `${indicator.code}::${name}`;
          if (!isCustom && exclusionMap.has(key)) {
            return {
              name,
              displayName: labelMap.get(key) ?? name,
              isCustom,
              customId,
              files,
              complete,
              excluded: true,
              excludeReason: exclusionMap.get(key) ?? "",
            };
          }
          if (!complete)
            missing.push({
              indicatorCode: indicator.code,
              displayCode,
              indicatorText: indicator.text,
              witnessName: labelMap.get(`${indicator.code}::${name}`) ?? name,
              domainId: domain.id,
            });
          return {
            name,
            displayName: labelMap.get(key) ?? name,
            isCustom,
            customId,
            files,
            complete,
            excluded: false,
          };
        };
        const witnesses = [
          ...indicator.requiredDocuments.map((name) =>
            makeWitness(name, false),
          ),
          ...(customByCode.get(indicator.code) ?? []).map((c) =>
            makeWitness(c.name, true, c.id),
          ),
        ];
        // المستبعدة («لا ينطبق») لا تدخل في الإجمالي ولا في المكتمل
        const active = witnesses.filter((w) => !w.excluded);
        const done = active.filter((w) => w.complete).length;
        criterionTotal += active.length;
        criterionCompleted += done;
        const excludeReason = notApplicable
          ? (exclusionMap.get(
              `${indicator.code}::${indicator.requiredDocuments[0]}`,
            ) ?? "")
          : "";
        return {
          code: indicator.code,
          displayCode,
          notApplicable,
          excludeReason,
          text: indicator.text,
          witnesses,
          completed: done,
          total: active.length,
        };
      });
      domainTotal += criterionTotal;
      domainCompleted += criterionCompleted;
      return {
        id: criterion.id,
        name: criterion.name,
        indicators,
        completed: criterionCompleted,
        total: criterionTotal,
      };
    });
    total += domainTotal;
    completed += domainCompleted;
    return {
      id: domain.id,
      name: domain.name,
      icon: domain.icon,
      criteria,
      completed: domainCompleted,
      total: domainTotal,
    };
  });

  return {
    domains: report,
    total,
    completed,
    percent: total ? Math.round((completed / total) * 100) : 0,
    uploadedFiles: evidence.length,
    missing,
  };
}

export function createProgressService(
  _db: Database,
  deps: {
    evidence: () => Evidence[];
    custom: () => CustomWitness[];
    labels: () => WitnessLabel[];
    exclusions: () => WitnessExclusion[];
  },
) {
  return {
    get(): ProgressReport {
      return computeProgress(
        deps.evidence(),
        deps.custom(),
        deps.labels(),
        deps.exclusions(),
      );
    },
  };
}
