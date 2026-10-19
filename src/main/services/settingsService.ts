// إعدادات التثبيت (settings.json في مجلد userData) — منفصلة عن بيانات المدرسة
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import type { AppSettings } from '@shared/types'

type Stored = AppSettings & { pinHash: string | null }

const defaults = (defaultDataDir: string): Stored => ({
  dataDir: defaultDataDir,
  autoBackup: true,
  autoBackupKeep: 7,
  pinEnabled: false,
  pinHash: null,
  lastAutoBackupAt: null,
  lastUpdateCheckAt: null
})

export function createSettingsService(settingsFile: string, defaultDataDir: string) {
  let state: Stored = defaults(defaultDataDir)

  const load = (): void => {
    try {
      if (fs.existsSync(settingsFile)) {
        const parsed = JSON.parse(fs.readFileSync(settingsFile, 'utf-8')) as Partial<Stored>
        state = { ...defaults(defaultDataDir), ...parsed }
        state.pinEnabled = Boolean(state.pinHash)
      }
    } catch {
      state = defaults(defaultDataDir)
    }
  }
  const persist = (): void => {
    fs.mkdirSync(path.dirname(settingsFile), { recursive: true })
    const tmp = `${settingsFile}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf-8')
    fs.renameSync(tmp, settingsFile)
  }
  load()

  const hashPin = (pin: string, salt: string): string => crypto.scryptSync(pin, salt, 32).toString('hex')

  return {
    get(): AppSettings {
      const { pinHash: _omit, ...rest } = state
      return { ...rest, pinEnabled: Boolean(state.pinHash) }
    },
    update(patch: Partial<Pick<AppSettings, 'autoBackup' | 'autoBackupKeep' | 'lastAutoBackupAt' | 'lastUpdateCheckAt' | 'dataDir'>>): AppSettings {
      state = { ...state, ...patch }
      persist()
      return this.get()
    },
    setPin(pin: string): void {
      const salt = crypto.randomBytes(16).toString('hex')
      state.pinHash = `${salt}:${hashPin(pin, salt)}`
      state.pinEnabled = true
      persist()
    },
    verifyPin(pin: string): boolean {
      if (!state.pinHash) return true
      const [salt, hash] = state.pinHash.split(':')
      const candidate = hashPin(pin, salt)
      return candidate.length === hash.length && crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'))
    },
    clearPin(): void {
      state.pinHash = null
      state.pinEnabled = false
      persist()
    }
  }
}

export type SettingsService = ReturnType<typeof createSettingsService>
