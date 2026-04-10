'use client'

import { useEffect, useState } from 'react'
import { X, ExternalLink, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { GraphNode, EntityType } from '@/types'
import { cn } from '@/lib/utils'

interface EntityDetail {
  entity: {
    id: number
    name: string
    type: EntityType
    mentionCount: number
    metadata: Record<string, unknown>
    createdAt: string
  }
  appearances: Array<{
    documentId: number
    documentName: string
    documentType: string
    mentions: number
    context: string
  }>
  relationships: Array<{
    id: number
    sourceId: number
    targetId: number
    type: string
    weight: number
    relatedEntity?: { id: number; name: string; type: string }
  }>
}

interface EntityPanelProps {
  node: GraphNode | null
  onClose: () => void
  onEntityClick?: (entityId: number) => void
}

export function EntityPanel({ node, onClose, onEntityClick }: EntityPanelProps) {
  const [detail, setDetail] = useState<EntityDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!node) { setDetail(null); return }
    const id = parseInt(node.id.replace('e', ''))
    if (isNaN(id)) return

    setLoading(true)
    fetch(`/api/entities/${id}`)
      .then(r => r.json())
      .then(data => setDetail(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [node])

  if (!node) return null

  return (
    <aside
      className={cn(
        'w-[320px] shrink-0 border-l border-white/[0.06] bg-[#0a0a0a]',
        'h-full overflow-y-auto flex flex-col'
      )}
      aria-label="Entity details"
    >
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-white/[0.06] sticky top-0 bg-[#0a0a0a] z-10">
        <div className="flex-1 min-w-0 pr-2">
          <Badge variant={node.type as EntityType} className="mb-2">{node.type}</Badge>
          <h2 className="text-sm font-semibold text-white leading-snug break-words">{node.name}</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close entity panel"
          className="shrink-0 text-white/40 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded mt-1"
        >
          <X className="size-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="size-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      ) : detail ? (
        <div className="flex-1 divide-y divide-white/[0.06]">
          {/* Stats */}
          <div className="px-5 py-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">Mentions</p>
              <p className="text-xl font-semibold text-white tabular-nums">{detail.entity.mentionCount}</p>
            </div>
            <div>
              <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">Documents</p>
              <p className="text-xl font-semibold text-white tabular-nums">{detail.appearances.length}</p>
            </div>
            <div>
              <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">Connections</p>
              <p className="text-xl font-semibold text-white tabular-nums">{detail.relationships.length}</p>
            </div>
            <div>
              <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">Added</p>
              <p className="text-xs text-white/50 font-mono mt-1">
                {new Date(detail.entity.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Documents */}
          {detail.appearances.length > 0 && (
            <div className="px-5 py-4">
              <h3 className="text-[11px] text-white/30 uppercase tracking-wider mb-3">Appears in</h3>
              <ul className="space-y-2">
                {detail.appearances.map((a, i) => (
                  <li key={i} className="text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="size-3 text-white/30 shrink-0" />
                      <span className="text-white/70 font-medium truncate">{a.documentName}</span>
                      <span className="ml-auto text-white/30 tabular-nums shrink-0">{a.mentions}×</span>
                    </div>
                    {a.context && (
                      <p className="text-white/30 pl-5 line-clamp-2 italic">{a.context}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Connections */}
          {detail.relationships.length > 0 && (
            <div className="px-5 py-4">
              <h3 className="text-[11px] text-white/30 uppercase tracking-wider mb-3">Connections</h3>
              <ul className="space-y-1.5">
                {detail.relationships.slice(0, 20).map((r) => (
                  <li key={r.id}>
                    {r.relatedEntity ? (
                      <button
                        onClick={() => onEntityClick?.(r.relatedEntity!.id)}
                        className="w-full flex items-center gap-2 text-xs text-left rounded px-2 py-1.5 hover:bg-white/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                      >
                        <span
                          className="size-1.5 rounded-full shrink-0"
                          style={{ background: typeColor(r.relatedEntity.type) }}
                        />
                        <span className="text-white/70 truncate flex-1">{r.relatedEntity.name}</span>
                        <Badge variant={r.relatedEntity.type as EntityType} className="shrink-0 text-[10px]">
                          {r.relatedEntity.type}
                        </Badge>
                      </button>
                    ) : null}
                  </li>
                ))}
                {detail.relationships.length > 20 && (
                  <li className="text-[11px] text-white/30 px-2">+{detail.relationships.length - 20} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </aside>
  )
}

function typeColor(type: string): string {
  const colors: Record<string, string> = {
    person: '#3b82f6',
    organization: '#a855f7',
    email: '#f97316',
    url: '#22c55e',
  }
  return colors[type] || '#6b7280'
}
