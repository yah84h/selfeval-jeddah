import type { Database } from '../db/database'
import type { ActivityEntry } from '@shared/types'
import { nowIso } from './paths'

export function createActivityService(db: Database) {
  return {
    log(action: string, details = ''): void {
      db.run('INSERT INTO activity_log (action, details, created_at) VALUES (?, ?, ?)', [action, details, nowIso()])
      // الاحتفاظ بآخر 2000 سجل فقط
      db.run('DELETE FROM activity_log WHERE id NOT IN (SELECT id FROM activity_log ORDER BY id DESC LIMIT 2000)')
    },
    recent(limit = 50): ActivityEntry[] {
      return db
        .all<{ id: number; action: string; details: string; created_at: string }>('SELECT * FROM activity_log ORDER BY id DESC LIMIT ?', [limit])
        .map(r => ({ id: r.id, action: r.action, details: r.details, createdAt: r.created_at }))
    }
  }
}

export type ActivityService = ReturnType<typeof createActivityService>
