import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { documents, entities, documentEntities, relationships } from '@/lib/db/schema'
import { extractPdfText } from '@/lib/ingestion/pdf'
import { extractTextContent } from '@/lib/ingestion/text'
import { extractCsvText } from '@/lib/ingestion/csv'
import { extractEntities } from '@/lib/extraction/entities'
import { eq, and } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const name = file.name
    const ext = name.split('.').pop()?.toLowerCase() as 'pdf' | 'txt' | 'md' | 'csv'
    const allowed = ['pdf', 'txt', 'md', 'csv']
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: `Unsupported file type: .${ext}` }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    let text = ''
    let metadata: Record<string, unknown> = {}

    if (ext === 'pdf') {
      const result = await extractPdfText(buffer)
      text = result.text
      metadata = { pages: result.pages, info: result.info }
    } else if (ext === 'csv') {
      const result = extractCsvText(buffer)
      text = result.text
      metadata = { rows: result.rows.length }
    } else {
      const result = extractTextContent(buffer, ext as 'txt' | 'md')
      text = result.text
    }

    const db = getDb()

    // Insert document
    const [doc] = await db.insert(documents).values({
      name,
      type: ext,
      content: text.slice(0, 500_000), // cap at 500k chars
      metadata: JSON.stringify(metadata),
    }).returning()

    // Extract entities
    const extracted = extractEntities(text)
    const entityIds: number[] = []

    for (const e of extracted) {
      // Check if entity already exists (case-insensitive)
      const existing = await db
        .select()
        .from(entities)
        .where(and(eq(entities.name, e.name), eq(entities.type, e.type)))
        .limit(1)

      let entityId: number
      if (existing.length > 0) {
        entityId = existing[0].id
      } else {
        const [newEntity] = await db.insert(entities).values({
          name: e.name,
          type: e.type,
          metadata: JSON.stringify({ contexts: e.contexts }),
        }).returning()
        entityId = newEntity.id
      }

      // Link entity to document
      const existingLink = await db
        .select()
        .from(documentEntities)
        .where(and(
          eq(documentEntities.documentId, doc.id),
          eq(documentEntities.entityId, entityId)
        ))
        .limit(1)

      if (existingLink.length === 0) {
        await db.insert(documentEntities).values({
          documentId: doc.id,
          entityId,
          mentions: e.mentions,
          context: e.contexts[0] || '',
        })
      }

      entityIds.push(entityId)
    }

    // Build co-occurrence relationships between entities in this document
    for (let i = 0; i < entityIds.length; i++) {
      for (let j = i + 1; j < entityIds.length; j++) {
        const src = entityIds[i], tgt = entityIds[j]
        const existing = await db
          .select()
          .from(relationships)
          .where(and(
            eq(relationships.sourceId, src),
            eq(relationships.targetId, tgt),
          ))
          .limit(1)

        if (existing.length === 0) {
          await db.insert(relationships).values({
            sourceId: src,
            targetId: tgt,
            type: 'CO_OCCURS',
            weight: 1,
            documentId: doc.id,
          })
        } else {
          // Strengthen existing edge
          await db
            .update(relationships)
            .set({ weight: existing[0].weight + 0.5 })
            .where(eq(relationships.id, existing[0].id))
        }
      }
    }

    return NextResponse.json({
      document: { id: doc.id, name: doc.name, type: doc.type },
      entitiesExtracted: extracted.length,
      relationships: (entityIds.length * (entityIds.length - 1)) / 2,
    })
  } catch (err) {
    console.error('Ingest error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Processing failed' },
      { status: 500 }
    )
  }
}
