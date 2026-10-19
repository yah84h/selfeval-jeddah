import type { Database } from '../db/database'
import type { School } from '@shared/types'
import { nowIso } from './paths'

type Row = { name: string; ministry_number: string; stage: string; gender: string; principal: string; coordinator: string; created_at: string }

const toSchool = (row: Row): School => ({
  name: row.name,
  ministryNumber: row.ministry_number,
  stage: row.stage,
  gender: row.gender,
  principal: row.principal,
  coordinator: row.coordinator,
  createdAt: row.created_at
})

export function createSchoolService(db: Database) {
  return {
    get(): School | null {
      const row = db.get<Row>('SELECT * FROM school WHERE id = 1')
      return row ? toSchool(row) : null
    },
    save(input: Omit<School, 'createdAt'>): School {
      const existing = db.get<Row>('SELECT * FROM school WHERE id = 1')
      if (existing) {
        db.run(
          'UPDATE school SET name = ?, ministry_number = ?, stage = ?, gender = ?, principal = ?, coordinator = ? WHERE id = 1',
          [input.name, input.ministryNumber, input.stage, input.gender, input.principal, input.coordinator]
        )
      } else {
        db.run(
          'INSERT INTO school (id, name, ministry_number, stage, gender, principal, coordinator, created_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?)',
          [input.name, input.ministryNumber, input.stage, input.gender, input.principal, input.coordinator, nowIso()]
        )
      }
      return this.get() as School
    }
  }
}

export type SchoolService = ReturnType<typeof createSchoolService>
