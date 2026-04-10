import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { entities, documentEntities } from '@/lib/db/schema'
import { eq, isNull, desc, sql } from 'drizzle-orm'

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

  // Add mention counts
  const withCounts = await Promise.all(filtered.map(async (e) => {
    const mentions = await db
      .select({ total: sql<number>`sum(${documentEntities.mentions})` })
      .from(documentEntities)
      .where(eq(documentEntities.entityId, e.id))

    return {
      ...e,
      metadata: JSON.parse(e.metadata),
      mentionCount: mentions[0]?.total || 0,
    }
  }))

  return NextResponse.json(withCounts)
}
