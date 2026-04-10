import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import path from 'path'
import { documents, entities, documentEntities, relationships } from './schema'

const DB_PATH = path.join(process.cwd(), 'opengraph.db')

let _db: ReturnType<typeof drizzle> | null = null
let _sqlite: Database.Database | null = null

function getSqlite(): Database.Database {
  if (!_sqlite) {
    _sqlite = new Database(DB_PATH)
    _sqlite.pragma('journal_mode = WAL')
    _sqlite.pragma('foreign_keys = ON')
  }
  return _sqlite
}

export function getDb() {
  if (!_db) {
    const sqlite = getSqlite()
    _db = drizzle(sqlite, { schema: { documents, entities, documentEntities, relationships } })
    migrate(sqlite)
  }
  return _db
}

function migrate(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      merged_into INTEGER REFERENCES entities(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS document_entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      mentions INTEGER NOT NULL DEFAULT 1,
      context TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      target_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'CO_OCCURS',
      weight REAL NOT NULL DEFAULT 1.0,
      metadata TEXT NOT NULL DEFAULT '{}',
      document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
    CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
    CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_id);
    CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_id);
    CREATE INDEX IF NOT EXISTS idx_doc_entities_doc ON document_entities(document_id);
    CREATE INDEX IF NOT EXISTS idx_doc_entities_entity ON document_entities(entity_id);
  `)
}
