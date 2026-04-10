import { NextRequest, NextResponse } from 'next/server'
import { getDb, withTransaction } from '@/lib/db'
import { documents, entities, documentEntities, relationships } from '@/lib/db/schema'
import { extractPdfText } from '@/lib/ingestion/pdf'
import { extractTextContent } from '@/lib/ingestion/text'
import { extractCsvText } from '@/lib/ingestion/csv'
import { extractEntities } from '@/lib/extraction/entities'
import { eq, and, inArray } from 'drizzle-orm'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    // Fix #7: reject oversized files before reading into memory
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum 50 MB.' }, { status: 413 })
    }

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

    const extracted = extractEntities(text)
    const db = getDb()

    // Fix #3 + #2: wrap everything in a transaction and batch all DB round-trips
    const response = await withTransaction(async () => {
      const [doc] = await db.insert(documents).values({
        name,
        type: ext,
        content: text.slice(0, 500_000),
        metadata: JSON.stringify(metadata),
      }).returning()

      if (extracted.length === 0) {
        return {
          document: { id: doc.id, name: doc.name, type: doc.type },
          entitiesExtracted: 0,
          relationships: 0,
        }
      }

      // --- Batch entity resolution (was one SELECT per entity) ---
      const nameList = [...new Set(extracted.map(e => e.name))]
      const existingEntities = await db
        .select()
        .from(entities)
        .where(inArray(entities.name, nameList))

      const entityMap = new Map<string, number>()
      for (const e of existingEntities) {
        entityMap.set(`${e.type}:${e.name}`, e.id)
      }

      const toInsertEntities = extracted.filter(
        e => !entityMap.has(`${e.type}:${e.name}`)
      )
      if (toInsertEntities.length > 0) {
        const inserted = await db.insert(entities).values(
          toInsertEntities.map(e => ({
            name: e.name,
            type: e.type,
            metadata: JSON.stringify({ contexts: e.contexts }),
          }))
        ).returning()
        for (const row of inserted) {
          entityMap.set(`${row.type}:${row.name}`, row.id)
        }
      }

      const entityIds = extracted.map(e => entityMap.get(`${e.type}:${e.name}`)!)
      const uniqueIds = [...new Set(entityIds)]

      // --- Batch document-entity link insertion (was one SELECT + INSERT per entity) ---
      const existingLinks = await db
        .select({ entityId: documentEntities.entityId })
        .from(documentEntities)
        .where(eq(documentEntities.documentId, doc.id))

      const linkedSet = new Set(existingLinks.map(l => l.entityId))

      const linksToInsert = extracted
        .map((e, i) => ({ e, id: entityIds[i] }))
        .filter(({ id }) => !linkedSet.has(id))
        .map(({ e, id }) => ({
          documentId: doc.id,
          entityId: id,
          mentions: e.mentions,
          context: e.contexts[0] || '',
        }))

      if (linksToInsert.length > 0) {
        await db.insert(documentEntities).values(linksToInsert)
      }

      // --- Batch relationship upsert (was one SELECT per pair = O(n²) queries) ---
      if (uniqueIds.length > 1) {
        const existingRels = await db
          .select()
          .from(relationships)
          .where(
            and(
              inArray(relationships.sourceId, uniqueIds),
              inArray(relationships.targetId, uniqueIds)
            )
          )

        const relMap = new Map<string, (typeof existingRels)[0]>()
        for (const r of existingRels) {
          relMap.set(`${r.sourceId}:${r.targetId}`, r)
        }

        const toInsertRels: {
          sourceId: number; targetId: number
          type: string; weight: number; documentId: number
        }[] = []
        const toUpdateRels: { id: number; weight: number }[] = []

        for (let i = 0; i < uniqueIds.length; i++) {
          for (let j = i + 1; j < uniqueIds.length; j++) {
            const src = uniqueIds[i], tgt = uniqueIds[j]
            const existing = relMap.get(`${src}:${tgt}`)
            if (existing) {
              toUpdateRels.push({ id: existing.id, weight: existing.weight + 0.5 })
            } else {
              toInsertRels.push({
                sourceId: src, targetId: tgt,
                type: 'CO_OCCURS', weight: 1, documentId: doc.id,
              })
            }
          }
        }

        if (toInsertRels.length > 0) {
          await db.insert(relationships).values(toInsertRels)
        }
        // Weight updates are only for pairs that already existed — typically few
        for (const r of toUpdateRels) {
          await db.update(relationships).set({ weight: r.weight }).where(eq(relationships.id, r.id))
        }
      }

      return {
        document: { id: doc.id, name: doc.name, type: doc.type },
        entitiesExtracted: extracted.length,
        relationships: (uniqueIds.length * (uniqueIds.length - 1)) / 2,
      }
    })

    return NextResponse.json(response)
  } catch (err) {
    console.error('Ingest error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Processing failed' },
      { status: 500 }
    )
  }
}
