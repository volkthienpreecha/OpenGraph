'use client'

import { useCallback, useEffect, useState } from 'react'
import { UploadZone } from '@/components/upload-zone'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, FileSpreadsheet, Trash2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Doc {
  id: number
  name: string
  type: string
  entityCount: number
  metadata: Record<string, unknown>
  createdAt: string
}

const typeIcon: Record<string, React.ElementType> = {
  pdf: FileText,
  txt: FileText,
  md: FileText,
  csv: FileSpreadsheet,
}

const typeVariant: Record<string, string> = {
  pdf: 'bg-red-500/10 text-red-400 border-red-500/20',
  txt: 'bg-white/[0.06] text-white/50 border-white/[0.08]',
  md: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  csv: 'bg-green-500/10 text-green-400 border-green-500/20',
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/documents')
      const data = await res.json()
      setDocs(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this document and its extracted entities?')) return
    setDeleting(id)
    await fetch(`/api/documents?id=${id}`, { method: 'DELETE' })
    await fetchDocs()
    setDeleting(null)
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-6 h-14 border-b border-white/[0.06] shrink-0">
        <h1 className="text-sm font-semibold text-white">Documents</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/30 font-mono tabular-nums">{docs.length} files</span>
          <Button size="sm" variant="ghost" onClick={fetchDocs} aria-label="Refresh document list">
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
          {/* Upload */}
          <section aria-label="Upload documents">
            <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-4">Ingest data</h2>
            <UploadZone onSuccess={fetchDocs} />
          </section>

          {/* Document list */}
          <section aria-label="Document list">
            <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-4">
              Ingested files
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="size-5 rounded-full border-2 border-white/10 border-t-white animate-spin" aria-label="Loading…" />
              </div>
            ) : docs.length === 0 ? (
              <div className="text-center py-12 text-white/30">
                <FileText className="size-8 mx-auto mb-3 opacity-30" aria-hidden />
                <p className="text-sm">No documents yet</p>
                <p className="text-xs mt-1">Upload files above to get started</p>
              </div>
            ) : (
              <ul className="space-y-2" aria-label="Ingested documents">
                {docs.map(doc => {
                  const Icon = typeIcon[doc.type] || FileText
                  return (
                    <li
                      key={doc.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
                    >
                      <div className="size-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
                        <Icon className="size-4 text-white/40" aria-hidden />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-white/30 mt-0.5">
                          {doc.entityCount} entities&nbsp;·&nbsp;
                          {new Date(doc.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>

                      <span className={cn(
                        'text-[11px] font-medium px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0',
                        typeVariant[doc.type] || typeVariant.txt
                      )}>
                        {doc.type}
                      </span>

                      {doc.type === 'pdf' && doc.metadata.pages != null && (
                        <span className="text-xs text-white/30 font-mono shrink-0">{String(doc.metadata.pages)}p</span>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => handleDelete(doc.id)}
                        loading={deleting === doc.id}
                        aria-label={`Delete ${doc.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
