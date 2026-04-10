import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { entities, documentEntities } from '@/lib/db/schema'
import { eq, isNull, desc, sql, inArray } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const db = getDb()

  const rows = await db
    .select({
      id: entities.id,
      name: entities.name,
      type: entities.type,
      metadata: entities.metadata,
      mergedInto: entities.mergedInto,
      createdAt: entities.createdAt,
    })
    .from(entities)
    .where(isNull(entities.mergedInto))
    .orderBy(desc(entities.createdAt))

  const filtered = type ? rows.filter(e => e.type === type) : rows

  if (filtered.length === 0) {
    return NextResponse.json([])
  }

  // Single aggregated query instead of one query per entity (fixes N+1).
  const filteredIds = filtered.map(e => e.id)
  const mentionTotals = await db
    .select({
      entityId: documentEntities.entityId,
      total: sql<number>`sum(${documentEntities.mentions})`,
    })
    .from(documentEntities)
    .where(inArray(documentEntities.entityId, filteredIds))
    .groupBy(documentEntities.entityId)

  const countMap = new Map(mentionTotals.map(m => [m.entityId, m.total]))

  const withCounts = filtered.map(e => ({
    ...e,
    metadata: JSON.parse(e.metadata),
    mentionCount: countMap.get(e.id) || 0,
  }))

  return NextResponse.json(withCounts)
}
