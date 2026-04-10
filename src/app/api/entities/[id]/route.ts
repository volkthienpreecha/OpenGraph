import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { entities, documentEntities, documents, relationships } from '@/lib/db/schema'
import { eq, or, sql } from 'drizzle-orm'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const entityId = parseInt(id)
  if (isNaN(entityId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const db = getDb()

  const [entity] = await db.select().from(entities).where(eq(entities.id, entityId)).limit(1)
  if (!entity) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Get all document appearances
  const appearances = await db
    .select({
      documentId: documentEntities.documentId,
      documentName: documents.name,
      documentType: documents.type,
      mentions: documentEntities.mentions,
      context: documentEntities.context,
    })
    .from(documentEntities)
    .leftJoin(documents, eq(documentEntities.documentId, documents.id))
    .where(eq(documentEntities.entityId, entityId))

  // Get all relationships
  const rels = await db
    .select({
      id: relationships.id,
      sourceId: relationships.sourceId,
      targetId: relationships.targetId,
      type: relationships.type,
      weight: relationships.weight,
    })
    .from(relationships)
    .where(
      or(eq(relationships.sourceId, entityId), eq(relationships.targetId, entityId))
    )

  // Get names of related entities
  const relatedIds = [...new Set(rels.flatMap(r => [r.sourceId, r.targetId]).filter(id => id !== entityId))]
  const relatedEntities = relatedIds.length > 0
    ? await db.select({ id: entities.id, name: entities.name, type: entities.type }).from(entities).where(
        sql`${entities.id} IN (${sql.join(relatedIds.map(id => sql`${id}`), sql`, `)})`
      )
    : []

  const entityMap = new Map(relatedEntities.map(e => [e.id, e]))

  const mentionCount = appearances.reduce((sum, a) => sum + a.mentions, 0)

  return NextResponse.json({
    entity: { ...entity, metadata: JSON.parse(entity.metadata), mentionCount },
    appearances,
    relationships: rels.map(r => ({
      ...r,
      relatedEntity: entityMap.get(r.sourceId === entityId ? r.targetId : r.sourceId),
    })),
  })
}
