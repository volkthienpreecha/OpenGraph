import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { entities } from '@/lib/db/schema'
import { getFullGraph, findPaths } from '@/lib/graph/query'
import { isNull, like, and, eq } from 'drizzle-orm'
import type { EntityType } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      q?: string
      type?: EntityType
      from?: string
      to?: string
      hops?: number
    }

    const db = getDb()

    // Path query: from + to
    if (body.from && body.to) {
      // Resolve entity names to IDs
      const [fromEntity] = await db
        .select()
        .from(entities)
        .where(and(like(entities.name, `%${body.from}%`), isNull(entities.mergedInto)))
        .limit(1)
      const [toEntity] = await db
        .select()
        .from(entities)
        .where(and(like(entities.name, `%${body.to}%`), isNull(entities.mergedInto)))
        .limit(1)

      if (!fromEntity || !toEntity) {
        return NextResponse.json({
          nodes: [], links: [],
          message: `Could not find ${!fromEntity ? `"${body.from}"` : `"${body.to}"`} in the graph`,
        })
      }

      const result = await findPaths(fromEntity.id, toEntity.id, body.hops || 4)
      return NextResponse.json({
        ...result,
        message: result.nodes.length === 0
          ? `No path found between "${body.from}" and "${body.to}" within ${body.hops || 4} hops`
          : `Found path between "${fromEntity.name}" and "${toEntity.name}"`,
      })
    }

    // Text search: filter graph by name
    if (body.q) {
      const matchingEntities = await db
        .select()
        .from(entities)
        .where(and(
          like(entities.name, `%${body.q}%`),
          isNull(entities.mergedInto),
          body.type ? eq(entities.type, body.type) : undefined
        ))

      return NextResponse.json({
        entities: matchingEntities.map(e => ({
          ...e,
          metadata: JSON.parse(e.metadata),
        })),
        message: `${matchingEntities.length} entities matching "${body.q}"`,
      })
    }

    // Default: full graph with optional type filter
    const graph = await getFullGraph(body.type ? { type: body.type } : undefined)
    return NextResponse.json(graph)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Query failed' },
      { status: 500 }
    )
  }
}
