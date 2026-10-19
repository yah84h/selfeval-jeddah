// طبقة قاعدة البيانات: SQLite عبر sql.js (WebAssembly — بلا وحدات أصلية تحتاج إعادة بناء على كل نظام)
// القاعدة صغيرة (بيانات وصفية فقط؛ ملفات الشواهد على القرص)، لذا تُحفظ كاملة إلى الملف بعد كل تعديل
// بكتابة ذرّية (ملف مؤقت ثم إعادة تسمية) حتى لا يتلف الملف عند انقطاع الكهرباء.
import fs from 'node:fs'
import path from 'node:path'
import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic, type SqlValue } from 'sql.js'
import { migrations, CURRENT_SCHEMA_VERSION } from './migrations'

let sqlJs: SqlJsStatic | null = null

export async function loadSqlJs(wasmCandidates: string[] = []): Promise<SqlJsStatic> {
  if (sqlJs) return sqlJs
  const candidates = [
    ...wasmCandidates,
    path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
  ]
  let wasmBinary: ArrayBuffer | undefined
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      const buf = fs.readFileSync(candidate)
      wasmBinary = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
      break
    }
  }
  sqlJs = await initSqlJs(wasmBinary ? { wasmBinary } : {})
  return sqlJs
}

export type Params = SqlValue[] | Record<string, SqlValue>

export class Database {
  private db: SqlJsDatabase
  private dirty = false
  private depth = 0

  private constructor(private readonly filePath: string, db: SqlJsDatabase) {
    this.db = db
  }

  /** يفتح (أو ينشئ) قاعدة البيانات وينفّذ الترحيلات الناقصة. */
  static async open(filePath: string, wasmCandidates: string[] = []): Promise<Database> {
    const SQL = await loadSqlJs(wasmCandidates)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    const exists = fs.existsSync(filePath)
    const raw = exists ? fs.readFileSync(filePath) : undefined
    const inner = raw && raw.length > 0 ? new SQL.Database(raw) : new SQL.Database()
    const database = new Database(filePath, inner)
    database.exec('PRAGMA foreign_keys = ON')
    database.migrate()
    database.save()
    return database
  }

  /** يفتح قاعدة من ذاكرة (للقراءة من نسخة احتياطية مثلًا) دون كتابة. */
  static async openBuffer(raw: Uint8Array, wasmCandidates: string[] = []): Promise<Database> {
    const SQL = await loadSqlJs(wasmCandidates)
    return new Database('', new SQL.Database(raw))
  }

  get path(): string { return this.filePath }

  exec(sql: string): void { this.db.exec(sql); this.dirty = true }

  run(sql: string, params: Params = []): { changes: number; lastId: number } {
    this.db.run(sql, params)
    this.dirty = true
    const changes = this.db.getRowsModified()
    const row = this.db.exec('SELECT last_insert_rowid() AS id')
    const lastId = Number(row[0]?.values[0]?.[0] ?? 0)
    this.commitIfTop()
    return { changes, lastId }
  }

  all<T = Record<string, unknown>>(sql: string, params: Params = []): T[] {
    const stmt = this.db.prepare(sql)
    try {
      stmt.bind(params)
      const rows: T[] = []
      while (stmt.step()) rows.push(stmt.getAsObject() as T)
      return rows
    } finally {
      stmt.free()
    }
  }

  get<T = Record<string, unknown>>(sql: string, params: Params = []): T | undefined {
    return this.all<T>(sql, params)[0]
  }

  /** معاملة: إما تُنفَّذ كل الخطوات أو لا شيء. */
  transaction<T>(fn: () => T): T {
    if (this.depth === 0) this.db.exec('BEGIN')
    this.depth++
    try {
      const result = fn()
      this.depth--
      if (this.depth === 0) { this.db.exec('COMMIT'); this.save() }
      return result
    } catch (error) {
      this.depth--
      if (this.depth === 0) this.db.exec('ROLLBACK')
      throw error
    }
  }

  private commitIfTop(): void { if (this.depth === 0) this.save() }

  /** كتابة ذرّية إلى القرص. */
  save(): void {
    if (!this.filePath || !this.dirty) return
    const data = this.db.export()
    const tmp = `${this.filePath}.tmp-${process.pid}`
    fs.writeFileSync(tmp, Buffer.from(data))
    fs.renameSync(tmp, this.filePath)
    this.dirty = false
  }

  export(): Uint8Array { return this.db.export() }

  close(): void { this.save(); this.db.close() }

  get schemaVersion(): number {
    const row = this.get<{ user_version: number }>('PRAGMA user_version')
    return Number(row?.user_version ?? 0)
  }

  /** ينفّذ الترحيلات المرقّمة التي لم تُطبَّق بعد (للأمام فقط). */
  private migrate(): void {
    this.db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)')
    const applied = new Set(this.all<{ version: number }>('SELECT version FROM schema_migrations').map(r => Number(r.version)))
    for (const migration of migrations) {
      if (applied.has(migration.version)) continue
      this.db.exec('BEGIN')
      try {
        for (const statement of migration.up) this.db.exec(statement)
        this.db.run('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)', [migration.version, migration.name, new Date().toISOString()])
        this.db.exec(`PRAGMA user_version = ${migration.version}`)
        this.db.exec('COMMIT')
        this.dirty = true
      } catch (error) {
        this.db.exec('ROLLBACK')
        throw new Error(`فشل الترحيل رقم ${migration.version} (${migration.name}): ${(error as Error).message}`)
      }
    }
    if (this.schemaVersion > CURRENT_SCHEMA_VERSION) {
      throw new Error(`بيانات المدرسة أُنشئت بإصدار أحدث من هذا البرنامج (مخطط ${this.schemaVersion} > ${CURRENT_SCHEMA_VERSION}). حدّث البرنامج أولًا.`)
    }
  }
}
