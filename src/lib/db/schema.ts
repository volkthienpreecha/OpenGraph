import { sql } from 'drizzle-orm'
import {
  integer,
  sqliteTable,
  text,
  real,
} from 'drizzle-orm/sqlite-core'

export const documents = sqliteTable('documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').notNull(),
  content: text('content').notNull().default(''),
  metadata: text('metadata').notNull().default('{}'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const entities = sqliteTable('entities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').notNull(),
  metadata: text('metadata').notNull().default('{}'),
  mergedInto: integer('merged_into'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const documentEntities = sqliteTable('document_entities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  documentId: integer('document_id').notNull().references(() => documents.id),
  entityId: integer('entity_id').notNull().references(() => entities.id),
  mentions: integer('mentions').notNull().default(1),
  context: text('context').notNull().default(''),
})

export const relationships = sqliteTable('relationships', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceId: integer('source_id').notNull().references(() => entities.id),
  targetId: integer('target_id').notNull().references(() => entities.id),
  type: text('type').notNull().default('CO_OCCURS'),
  weight: real('weight').notNull().default(1.0),
  metadata: text('metadata').notNull().default('{}'),
  documentId: integer('document_id').references(() => documents.id),
})
