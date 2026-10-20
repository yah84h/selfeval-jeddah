// الترحيلات المرقّمة لمخطط قاعدة البيانات.
// القاعدة: لا تُعدَّل ترحيلة بعد نشرها؛ أضف ترحيلة جديدة برقم أعلى.
// عند التحديث تُنفَّذ الترحيلات الناقصة فقط بعد أخذ نسخة احتياطية تلقائية.

export type Migration = { version: number; name: string; up: string[] }

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial',
    up: [
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS school (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL,
        ministry_number TEXT NOT NULL DEFAULT '',
        stage TEXT NOT NULL DEFAULT '',
        gender TEXT NOT NULL DEFAULT '',
        principal TEXT NOT NULL DEFAULT '',
        coordinator TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS evidence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        indicator_code TEXT NOT NULL,
        witness_name TEXT NOT NULL,
        file_name TEXT NOT NULL,
        stored_name TEXT NOT NULL,
        mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
        file_size INTEGER NOT NULL DEFAULT 0,
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        deleted_at TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_evidence_indicator ON evidence (indicator_code, witness_name)`,
      `CREATE TABLE IF NOT EXISTS custom_witness (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        indicator_code TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (indicator_code, name)
      )`,
      `CREATE TABLE IF NOT EXISTS witness_label (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        indicator_code TEXT NOT NULL,
        original_name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (indicator_code, original_name)
      )`,
      `CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        details TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      )`
    ]
  },
  {
    version: 2,
    name: 'witness-exclusion',
    up: [
      // الشواهد التي قررت المدرسة أنها «لا تنطبق» عليها — تُستبعد من الحساب والتقرير ويمكن إعادة تفعيلها
      `CREATE TABLE IF NOT EXISTS witness_exclusion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        indicator_code TEXT NOT NULL,
        original_name TEXT NOT NULL,
        reason TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        UNIQUE (indicator_code, original_name)
      )`
    ]
  }
  // مثال لترحيلة مستقبلية:
  // { version: 2, name: 'evidence-tags', up: ['ALTER TABLE evidence ADD COLUMN tags TEXT NOT NULL DEFAULT ""'] }
]

export const CURRENT_SCHEMA_VERSION = migrations[migrations.length - 1].version
