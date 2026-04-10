import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { entities, documentEntities, relationships } from '@/lib/db/schema'
import { isNull, eq, or, and, inArray } from 'drizzle-orm'
import { findMergeCandidates } from '@/lib/resolution/merge'
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

    // Re-point document_entities from mergeId -> keepId
    await db
      .update(documentEntities)
      .set({ entityId: keepId })
      .where(eq(documentEntities.entityId, mergeId))

    // Deduplicate document_entities: same (document_id, keepId) pairs now
    // appear twice when both entities appeared in the same document.
    const allDocEnts = await db
      .select()
      .from(documentEntities)
      .where(eq(documentEntities.entityId, keepId))

    const docEntSeen = new Map<number, { id: number; mentions: number }>()
    const docEntsToDelete: number[] = []
    const docEntsToUpdate: { id: number; mentions: number }[] = []

    for (const row of allDocEnts) {
      if (docEntSeen.has(row.documentId)) {
        const first = docEntSeen.get(row.documentId)!
        first.mentions += row.mentions
        docEntsToDelete.push(row.id)
      } else {
        docEntSeen.set(row.documentId, { id: row.id, mentions: row.mentions })
      }
    }
    for (const [, { id, mentions }] of docEntSeen) {
      const orig = allDocEnts.find(r => r.id === id)
      if (orig && orig.mentions !== mentions) {
        docEntsToUpdate.push({ id, mentions })
      }
    }
    for (const { id, mentions } of docEntsToUpdate) {
      await db.update(documentEntities).set({ mentions }).where(eq(documentEntities.id, id))
    }
    if (docEntsToDelete.length > 0) {
      await db.delete(documentEntities).where(inArray(documentEntities.id, docEntsToDelete))
    }

    // Re-point relationships from mergeId -> keepId
    await db
      .update(relationships)
      .set({ sourceId: keepId })
      .where(eq(relationships.sourceId, mergeId))

    await db
      .update(relationships)
      .set({ targetId: keepId })
      .where(eq(relationships.targetId, mergeId))

    // Fix #5a: delete self-loops created when A↔B existed and B merged into A
    await db.delete(relationships).where(
      and(
        eq(relationships.sourceId, keepId),
        eq(relationships.targetId, keepId)
      )
    )

    // Fix #5b: deduplicate edges — if A→C existed and B→C also existed, we now
    // have two A→C edges; keep the one with higher combined weight.
    const allEdges = await db
      .select()
      .from(relationships)
      .where(or(eq(relationships.sourceId, keepId), eq(relationships.targetId, keepId)))

    const edgeSeen = new Map<string, { id: number; totalWeight: number }>()
    const edgesToDelete: number[] = []
    const edgesToUpdate: { id: number; weight: number }[] = []

    for (const edge of allEdges) {
      // Normalise key so A→C and C→A are treated as the same undirected edge
      const [s, t] = edge.sourceId < edge.targetId
        ? [edge.sourceId, edge.targetId]
        : [edge.targetId, edge.sourceId]
      const key = `${s}:${t}`

      if (edgeSeen.has(key)) {
        const first = edgeSeen.get(key)!
        first.totalWeight += edge.weight
        edgesToDelete.push(edge.id)
      } else {
        edgeSeen.set(key, { id: edge.id, totalWeight: edge.weight })
      }
    }
    for (const [, { id, totalWeight }] of edgeSeen) {
      const orig = allEdges.find(e => e.id === id)
      if (orig && orig.weight !== totalWeight) {
        edgesToUpdate.push({ id, weight: totalWeight })
      }
    }
    for (const { id, weight } of edgesToUpdate) {
      await db.update(relationships).set({ weight }).where(eq(relationships.id, id))
    }
    if (edgesToDelete.length > 0) {
      await db.delete(relationships).where(inArray(relationships.id, edgesToDelete))
    }

    // Mark mergeId as merged
    await db
      .update(entities)
      .set({ mergedInto: keepId })
      .where(eq(entities.id, mergeId))

    // Fix #11: fix transitive chain — any entity previously merged into mergeId
    // should now point directly to keepId so resolution stays consistent.
    await db
      .update(entities)
      .set({ mergedInto: keepId })
      .where(eq(entities.mergedInto, mergeId))

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Merge failed' },
      { status: 500 }
    )
  }
}
