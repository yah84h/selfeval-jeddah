// مسارات التخزين: مجلد البيانات مستقل تمامًا عن مجلد البرنامج.
// البرنامج: مجلد التثبيت (يُستبدل عند التحديث)
// البيانات: <dataDir>/data.db + evidence/ + trash/ + backups/  (لا يُمَس بالتحديث)
import fs from 'node:fs'
import path from 'node:path'

export type DataPaths = {
  dataDir: string
  dbFile: string
  evidenceDir: string
  trashDir: string
  backupsDir: string
}

export function buildDataPaths(dataDir: string): DataPaths {
  return {
    dataDir,
    dbFile: path.join(dataDir, 'data.db'),
    evidenceDir: path.join(dataDir, 'evidence'),
    trashDir: path.join(dataDir, 'trash'),
    backupsDir: path.join(dataDir, 'backups')
  }
}

export function ensureDataDirs(paths: DataPaths): void {
  for (const dir of [paths.dataDir, paths.evidenceDir, paths.trashDir, paths.backupsDir]) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/** تنظيف اسم للاستخدام كمجلد/ملف: يحافظ على العربية ويزيل فقط الأحرف غير المسموحة في أنظمة الملفات. */
export function safeSegment(name: string, fallback = 'item'): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, 120)
  return cleaned || fallback
}

/** يعيد اسمًا غير مكرر داخل المجلد: "ملف.pdf" ← "ملف (2).pdf" */
export function uniqueFileName(dir: string, fileName: string): string {
  const ext = path.extname(fileName)
  const base = path.basename(fileName, ext)
  let candidate = fileName
  let counter = 2
  while (fs.existsSync(path.join(dir, candidate))) {
    candidate = `${base} (${counter})${ext}`
    counter++
  }
  return candidate
}

export function witnessDir(paths: DataPaths, indicatorCode: string, witnessName: string): string {
  return path.join(paths.evidenceDir, safeSegment(indicatorCode, 'indicator'), safeSegment(witnessName, 'witness'))
}

export function evidenceFilePath(paths: DataPaths, storedName: string): string {
  // storedName مسار نسبي داخل evidence/ (مجلد المؤشر/مجلد الشاهد/الملف)
  const resolved = path.resolve(paths.evidenceDir, storedName)
  if (!resolved.startsWith(path.resolve(paths.evidenceDir) + path.sep)) {
    throw new Error('مسار ملف غير صالح')
  }
  return resolved
}

export function nowIso(): string { return new Date().toISOString() }

export function fileStamp(date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
}
