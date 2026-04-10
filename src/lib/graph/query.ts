import { getDb } from '@/lib/db'
import { entities, relationships, documentEntities } from '@/lib/db/schema'
import { eq, or, inArray, and, isNull } from 'drizzle-orm'
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

/**
 * BFS path search with lazy, level-by-level adjacency loading.
 *
 * Previously this loaded every row in the relationships table upfront
 * (SELECT * FROM relationships with no WHERE clause), which OOMs on large
 * graphs. Now we load only the neighbor lists for nodes we actually visit,
 * one batch per BFS level — at most `maxHops` database round-trips total.
 */
export async function findPaths(fromEntityId: number, toEntityId: number, maxHops = 4): Promise<GraphData> {
  const db = getDb()

  // adj[id] = list of neighbor ids. A key present in the map means the
  // node's edges have already been fetched from the DB.
  const adj = new Map<number, number[]>()

  async function ensureLoaded(ids: number[]) {
    const fresh = ids.filter(id => !adj.has(id))
    if (!fresh.length) return
    // Pre-mark so parallel calls don't double-fetch
    for (const id of fresh) adj.set(id, [])
    const rels = await db
      .select()
      .from(relationships)
      .where(
        or(
          inArray(relationships.sourceId, fresh),
          inArray(relationships.targetId, fresh)
        )
      )
    for (const rel of rels) {
      adj.get(rel.sourceId)?.push(rel.targetId)
      adj.get(rel.targetId)?.push(rel.sourceId)
    }
  }

  // Load the start node's neighbors before BFS begins
  await ensureLoaded([fromEntityId])

  type QItem = { node: number; path: number[] }
  const visited = new Set<number>([fromEntityId])
  let currentLevel: QItem[] = [{ node: fromEntityId, path: [fromEntityId] }]
  const foundPaths: number[][] = []

  for (let hop = 0; hop < maxHops && currentLevel.length > 0 && foundPaths.length < 3; hop++) {
    const nextLevel: QItem[] = []
    const nextNodes = new Set<number>()

    for (const { node, path } of currentLevel) {
      if (node === toEntityId) {
        foundPaths.push(path)
        if (foundPaths.length >= 3) break
        continue
      }
      for (const neighbor of adj.get(node) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          nextNodes.add(neighbor)
          nextLevel.push({ node: neighbor, path: [...path, neighbor] })
        }
      }
    }

    if (foundPaths.length >= 3) break
    if (nextNodes.size > 0) await ensureLoaded([...nextNodes])
    currentLevel = nextLevel
  }

  // Check if destination is in the final level
  for (const { node, path } of currentLevel) {
    if (node === toEntityId && foundPaths.length < 3) foundPaths.push(path)
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
