import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { documents, documentEntities, entities } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  const db = getDb()
  const docs = await db
    .select()
    .from(documents)
    .orderBy(desc(documents.createdAt))

  const result = await Promise.all(docs.map(async (doc) => {
    const entityCount = await db
      .select()
      .from(documentEntities)
      .where(eq(documentEntities.documentId, doc.id))

    return {
      id: doc.id,
      name: doc.name,
      type: doc.type,
      metadata: JSON.parse(doc.metadata),
      entityCount: entityCount.length,
      createdAt: doc.createdAt,
    }
  }))

  return NextResponse.json(result)
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = parseInt(searchParams.get('id') || '0')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = getDb()
  await db.delete(documents).where(eq(documents.id, id))
  return NextResponse.json({ success: true })
}
