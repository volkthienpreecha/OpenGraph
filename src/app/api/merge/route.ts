import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { entities, documentEntities, relationships } from '@/lib/db/schema'
import { isNull } from 'drizzle-orm'
import { findMergeCandidates } from '@/lib/resolution/merge'
import { eq, or } from 'drizzle-orm'
import type { Entity } from '@/types'

// GET: return merge candidates
export async function GET() {
  const db = getDb()
  const rows = await db.select().from(entities).where(isNull(entities.mergedInto))

  const entityList: Entity[] = rows.map(e => ({
    id: e.id,
    name: e.name,
    type: e.type as Entity['type'],
    metadata: JSON.parse(e.metadata),
    mergedInto: e.mergedInto ?? null,
    mentionCount: 0,
    createdAt: e.createdAt,
  }))

  const candidates = findMergeCandidates(entityList)
  return NextResponse.json(candidates)
}

// POST: perform a merge (keep entity1, redirect entity2 -> entity1)
export async function POST(request: NextRequest) {
  try {
    const { keepId, mergeId } = await request.json() as { keepId: number; mergeId: number }
    if (!keepId || !mergeId) return NextResponse.json({ error: 'Missing ids' }, { status: 400 })

    const db = getDb()

    // Re-point all document_entities from mergeId -> keepId
    await db
      .update(documentEntities)
      .set({ entityId: keepId })
      .where(eq(documentEntities.entityId, mergeId))

    // Re-point relationships
    await db
      .update(relationships)
      .set({ sourceId: keepId })
      .where(eq(relationships.sourceId, mergeId))

    await db
      .update(relationships)
      .set({ targetId: keepId })
      .where(eq(relationships.targetId, mergeId))

    // Mark mergeId as merged
    await db
      .update(entities)
      .set({ mergedInto: keepId })
      .where(eq(entities.id, mergeId))

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Merge failed' },
      { status: 500 }
    )
  }
}
