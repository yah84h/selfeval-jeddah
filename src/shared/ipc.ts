// عقود IPC: أسماء القنوات + مخططات التحقق من المدخلات (zod)
// تُستخدم في main للتحقق، وفي preload/renderer للأنواع.
import { z } from 'zod'

export const MAX_FILE_BYTES = 50 * 1024 * 1024 // 50 ميجابايت لكل ملف شاهد

export const ALLOWED_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'txt', 'csv', 'zip', 'rar'
] as const

export const indicatorCodeSchema = z.string().min(3).max(32)
export const witnessNameSchema = z.string().trim().min(1).max(255)

export const schemas = {
  'school.save': z.object({
    name: z.string().trim().min(2).max(255),
    ministryNumber: z.string().trim().max(64).default(''),
    stage: z.string().trim().max(64).default(''),
    gender: z.string().trim().max(32).default(''),
    principal: z.string().trim().max(255).default(''),
    coordinator: z.string().trim().max(255).default('')
  }),
  'evidence.addFromPaths': z.object({
    indicatorCode: indicatorCodeSchema,
    witnessName: witnessNameSchema,
    paths: z.array(z.string().min(1)).min(1).max(50)
  }),
  'evidence.pick': z.object({ indicatorCode: indicatorCodeSchema, witnessName: witnessNameSchema }),
  'evidence.remove': z.object({ id: z.number().int().positive() }),
  'evidence.restore': z.object({ id: z.number().int().positive() }),
  'evidence.purge': z.object({ id: z.number().int().positive() }),
  'evidence.removeWitnessFiles': z.object({ indicatorCode: indicatorCodeSchema, witnessName: witnessNameSchema }),
  'evidence.open': z.object({ id: z.number().int().positive() }),
  'evidence.setNote': z.object({ id: z.number().int().positive(), note: z.string().max(2000) }),
  'evidence.previewUrl': z.object({ id: z.number().int().positive() }),
  'witness.addCustom': z.object({ indicatorCode: indicatorCodeSchema, name: witnessNameSchema }),
  'witness.removeCustom': z.object({ id: z.number().int().positive() }),
  'witness.rename': z.object({ indicatorCode: indicatorCodeSchema, originalName: witnessNameSchema, displayName: witnessNameSchema }),
  'witness.resetName': z.object({ indicatorCode: indicatorCodeSchema, originalName: witnessNameSchema }),
  'backup.create': z.object({ kind: z.enum(['manual', 'auto', 'pre-update', 'pre-restore']).default('manual') }),
  'backup.restore': z.object({ path: z.string().min(1), mode: z.enum(['replace', 'merge']) }),
  'backup.inspect': z.object({ path: z.string().min(1) }),
  'backup.delete': z.object({ path: z.string().min(1) }),
  'settings.save': z.object({
    autoBackup: z.boolean().optional(),
    autoBackupKeep: z.number().int().min(1).max(60).optional()
  }),
  'pin.set': z.object({ pin: z.string().regex(/^\d{4,8}$/) }),
  'pin.verify': z.object({ pin: z.string().min(1).max(16) }),
  'pin.clear': z.object({ pin: z.string().min(1).max(16) }),
  'report.exportPdf': z.object({ html: z.string().min(1) }),
  'shell.openPath': z.object({ path: z.string().min(1) })
} as const

export type SchemaKey = keyof typeof schemas
export type Input<K extends SchemaKey> = z.input<(typeof schemas)[K]>

export { EVENTS } from './events'
