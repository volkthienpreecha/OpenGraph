import { NextRequest, NextResponse } from 'next/server'
import { getFullGraph } from '@/lib/graph/query'
import type { EntityType } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') as EntityType | null

  const graph = await getFullGraph(type ? { type } : undefined)
  return NextResponse.json(graph)
}
