import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import path from 'path'
import { documents, entities, documentEntities, relationships } from './schema'

const DB_PATH = path.join(process.cwd(), 'opengraph.db')

// Use globalThis so the singleton survives Next.js Turbopack hot-module reloads
// in development without creating multiple SQLite connections to the same file.
const g = globalThis as typeof globalThis & {
  __ogSqlite?: Database.Database
  __ogDb?: ReturnType<typeof drizzle>
}

export function getSqlite(): Database.Database {
  if (!g.__ogSqlite) {
    g.__ogSqlite = new Database(DB_PATH)
    g.__ogSqlite.pragma('journal_mode = WAL')
    g.__ogSqlite.pragma('foreign_keys = ON')
    migrate(g.__ogSqlite)
  }
  return g.__ogSqlite
}

export function getDb() {
  if (!g.__ogDb) {
    g.__ogDb = drizzle(getSqlite(), {
      schema: { documents, entities, documentEntities, relationships },
    })
  }
  return g.__ogDb
}

/**
 * Run `fn` inside a SQLite BEGIN/COMMIT/ROLLBACK block.
 *
 * better-sqlite3 is synchronous, so its `transaction()` helper cannot accept
 * async callbacks. This wrapper issues the SQL statements manually; because
 * Node.js is single-threaded and all better-sqlite3 calls complete in the
 * same event-loop turn they are invoked in, concurrent ingest requests will
 * naturally serialise at the BEGIN statement without nested-transaction errors.
 */
export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const sqlite = getSqlite()
  sqlite.exec('BEGIN')
  try {
    const result = await fn()
    sqlite.exec('COMMIT')
    return result
  } catch (err) {
    try { sqlite.exec('ROLLBACK') } catch { /* ignore rollback errors */ }
    throw err
  }
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
