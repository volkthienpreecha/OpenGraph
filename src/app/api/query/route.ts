import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { entities } from '@/lib/db/schema'
import { getFullGraph, findPaths } from '@/lib/graph/query'
import { isNull, like, and, eq } from 'drizzle-orm'
import type { EntityType } from '@/types'

const MAX_QUERY_LEN = 200

/** Escape SQLite LIKE wildcards so user input is treated as a literal string. */
function escapeLike(s: string): string {
  return s.replace(/%/g, '\\%').replace(/_/g, '\\_')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      q?: string
      type?: EntityType
      from?: string
      to?: string
      hops?: number
    }

    // Fix #8: validate input lengths to prevent catastrophic LIKE backtracking
    if ((body.q?.length ?? 0) > MAX_QUERY_LEN ||
        (body.from?.length ?? 0) > MAX_QUERY_LEN ||
        (body.to?.length ?? 0) > MAX_QUERY_LEN) {
      return NextResponse.json({ error: 'Query string too long (max 200 characters)' }, { status: 400 })
    }

    const db = getDb()

    // Path query: from + to
    if (body.from && body.to) {
      const safeFrom = escapeLike(body.from)
      const safeTo = escapeLike(body.to)

      const [fromEntity] = await db
        .select()
        .from(entities)
        .where(and(like(entities.name, `%${safeFrom}%`), isNull(entities.mergedInto)))
        .limit(1)
      const [toEntity] = await db
        .select()
        .from(entities)
        .where(and(like(entities.name, `%${safeTo}%`), isNull(entities.mergedInto)))
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
      const safeQ = escapeLike(body.q)
      const matchingEntities = await db
        .select()
        .from(entities)
        .where(and(
          like(entities.name, `%${safeQ}%`),
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
