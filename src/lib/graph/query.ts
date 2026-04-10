import { getDb } from '@/lib/db'
import { entities, relationships, documentEntities } from '@/lib/db/schema'
import { eq, or, inArray, and, isNull, ne } from 'drizzle-orm'
import type { GraphData, GraphNode, GraphLink, EntityType } from '@/types'

const NODE_COLORS: Record<string, string> = {
  person: '#3b82f6',       // blue
  organization: '#a855f7', // purple
  email: '#f97316',        // orange
  url: '#22c55e',          // green
  document: '#6b7280',     // gray
}

export async function getFullGraph(filter?: { type?: EntityType }): Promise<GraphData> {
  const db = getDb()

  const entityRows = await db
    .select()
    .from(entities)
    .where(
      filter?.type
        ? and(eq(entities.type, filter.type), isNull(entities.mergedInto))
        : isNull(entities.mergedInto)
    )

  // Get mention counts
  const mentionCounts = await db
    .select({ entityId: documentEntities.entityId, total: documentEntities.mentions })
    .from(documentEntities)

  const countMap = new Map<number, number>()
  for (const row of mentionCounts) {
    countMap.set(row.entityId, (countMap.get(row.entityId) || 0) + row.total)
  }

  const entityIds = new Set(entityRows.map(e => e.id))

  const rels = entityIds.size > 0
    ? await db
        .select()
        .from(relationships)
        .where(
          or(
            inArray(relationships.sourceId, [...entityIds]),
            inArray(relationships.targetId, [...entityIds])
          )
        )
    : []

  const nodes: GraphNode[] = entityRows.map(e => ({
    id: `e${e.id}`,
    name: e.name,
    type: e.type as EntityType,
    val: Math.log1p(countMap.get(e.id) || 1) * 3 + 2,
    color: NODE_COLORS[e.type] || '#6b7280',
    mentionCount: countMap.get(e.id) || 0,
    metadata: JSON.parse(e.metadata),
  }))

  const links: GraphLink[] = rels
    .filter(r => entityIds.has(r.sourceId) && entityIds.has(r.targetId))
    .map(r => ({
      source: `e${r.sourceId}`,
      target: `e${r.targetId}`,
      type: r.type as GraphLink['type'],
      weight: r.weight,
    }))

  return { nodes, links }
}

export async function findPaths(fromEntityId: number, toEntityId: number, maxHops = 4): Promise<GraphData> {
  const db = getDb()

  // BFS over the graph
  const adj = new Map<number, number[]>()
  const allRels = await db.select().from(relationships)

  for (const rel of allRels) {
    if (!adj.has(rel.sourceId)) adj.set(rel.sourceId, [])
    if (!adj.has(rel.targetId)) adj.set(rel.targetId, [])
    adj.get(rel.sourceId)!.push(rel.targetId)
    adj.get(rel.targetId)!.push(rel.sourceId)
  }

  // BFS
  const visited = new Set<number>()
  const queue: { node: number; path: number[] }[] = [{ node: fromEntityId, path: [fromEntityId] }]
  visited.add(fromEntityId)
  const foundPaths: number[][] = []

  while (queue.length > 0) {
    const { node, path } = queue.shift()!
    if (path.length > maxHops + 1) continue
    if (node === toEntityId) {
      foundPaths.push(path)
      if (foundPaths.length >= 3) break
      continue
    }
    for (const neighbor of adj.get(node) || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push({ node: neighbor, path: [...path, neighbor] })
      }
    }
  }

  if (foundPaths.length === 0) return { nodes: [], links: [] }

  const pathNodes = new Set<number>(foundPaths.flat())
  const entityRows = await db
    .select()
    .from(entities)
    .where(inArray(entities.id, [...pathNodes]))

  const rels = await db
    .select()
    .from(relationships)
    .where(
      or(
        inArray(relationships.sourceId, [...pathNodes]),
        inArray(relationships.targetId, [...pathNodes])
      )
    )

  const nodes: GraphNode[] = entityRows.map(e => ({
    id: `e${e.id}`,
    name: e.name,
    type: e.type as EntityType,
    val: e.id === fromEntityId || e.id === toEntityId ? 8 : 4,
    color: NODE_COLORS[e.type] || '#6b7280',
    mentionCount: 0,
    metadata: JSON.parse(e.metadata),
  }))

  const links: GraphLink[] = rels
    .filter(r => pathNodes.has(r.sourceId) && pathNodes.has(r.targetId))
    .map(r => ({
      source: `e${r.sourceId}`,
      target: `e${r.targetId}`,
      type: r.type as GraphLink['type'],
      weight: r.weight,
    }))

  return { nodes, links }
}

export async function getEntityNeighbors(entityId: number): Promise<GraphData> {
  const db = getDb()

  const rels = await db
    .select()
    .from(relationships)
    .where(
      or(
        eq(relationships.sourceId, entityId),
        eq(relationships.targetId, entityId)
      )
    )

  const neighborIds = new Set<number>()
  neighborIds.add(entityId)
  for (const r of rels) {
    neighborIds.add(r.sourceId)
    neighborIds.add(r.targetId)
  }

  const entityRows = await db
    .select()
    .from(entities)
    .where(inArray(entities.id, [...neighborIds]))

  const nodes: GraphNode[] = entityRows.map(e => ({
    id: `e${e.id}`,
    name: e.name,
    type: e.type as EntityType,
    val: e.id === entityId ? 10 : 4,
    color: NODE_COLORS[e.type] || '#6b7280',
    mentionCount: 0,
    metadata: JSON.parse(e.metadata),
  }))

  const links: GraphLink[] = rels.map(r => ({
    source: `e${r.sourceId}`,
    target: `e${r.targetId}`,
    type: r.type as GraphLink['type'],
    weight: r.weight,
  }))

  return { nodes, links }
}
