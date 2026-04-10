'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Merge, RefreshCw, CheckCircle } from 'lucide-react'
import type { MergeCandidate, EntityType } from '@/types'
import { cn } from '@/lib/utils'

export default function MergePage() {
  const [candidates, setCandidates] = useState<MergeCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmCandidate, setConfirmCandidate] = useState<MergeCandidate | null>(null)
  const [merging, setMerging] = useState(false)
  const [merged, setMerged] = useState<Set<string>>(new Set())

  const fetchCandidates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/merge')
      const data = await res.json()
      setCandidates(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCandidates() }, [fetchCandidates])

  const handleMerge = async (keep: number, merge: number) => {
    setMerging(true)
    try {
      await fetch('/api/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepId: keep, mergeId: merge }),
      })
      setMerged(s => new Set([...s, `${keep}-${merge}`]))
      setConfirmCandidate(null)
      await fetchCandidates()
    } finally {
      setMerging(false)
    }
  }

  const pending = candidates.filter(c => !merged.has(`${c.entity1.id}-${c.entity2.id}`))

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-6 h-14 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-white">Entity Resolution</h1>
          {pending.length > 0 && (
            <span className="h-5 px-2 rounded-full bg-orange-500/20 text-orange-400 text-[11px] font-medium flex items-center">
              {pending.length} to review
            </span>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={fetchCandidates} aria-label="Refresh candidates">
          <RefreshCw className="size-3.5" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
          <div className="text-sm text-white/40 leading-relaxed">
            OpenGraph detected these pairs as potentially the same entity. Review and merge, or dismiss.
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="size-5 rounded-full border-2 border-white/10 border-t-white animate-spin" aria-label="Loading…" />
            </div>
          ) : pending.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle className="size-8 mx-auto mb-3 text-green-500/50" aria-hidden />
              <p className="text-sm text-white/50">No merge candidates found</p>
              <p className="text-xs text-white/30 mt-1">Your graph looks clean</p>
            </div>
          ) : (
            <ul className="space-y-3" aria-label="Merge candidates">
              {pending.map((c, i) => (
                <li
                  key={i}
                  className="border border-white/[0.06] rounded-xl overflow-hidden"
                >
                  <div className="flex items-center px-5 py-4 gap-4">
                    {/* Entity 1 */}
                    <div className="flex-1 min-w-0">
                      <Badge variant={c.entity1.type as EntityType} className="mb-1.5">{c.entity1.type}</Badge>
                      <p className="text-sm font-medium text-white truncate">{c.entity1.name}</p>
                    </div>

                    {/* Similarity */}
                    <div className="flex flex-col items-center gap-1 shrink-0 px-2">
                      <Merge className="size-4 text-white/20" aria-hidden />
                      <span className={cn(
                        'text-[11px] font-mono font-medium',
                        c.similarity >= 0.95 ? 'text-green-400' : c.similarity >= 0.88 ? 'text-yellow-400' : 'text-white/40'
                      )}>
                        {Math.round(c.similarity * 100)}%
                      </span>
                      <span className="text-[10px] text-white/25 text-center max-w-16 leading-tight">{c.reason}</span>
                    </div>

                    {/* Entity 2 */}
                    <div className="flex-1 min-w-0 text-right">
                      <Badge variant={c.entity2.type as EntityType} className="mb-1.5">{c.entity2.type}</Badge>
                      <p className="text-sm font-medium text-white truncate">{c.entity2.name}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 px-5 py-3 bg-white/[0.02] border-t border-white/[0.06]">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setConfirmCandidate(c)}
                    >
                      Merge into &ldquo;{c.entity1.name.length > 20 ? c.entity1.name.slice(0, 18) + '…' : c.entity1.name}&rdquo;
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMerged(s => new Set([...s, `${c.entity1.id}-${c.entity2.id}`]))}
                      aria-label="Dismiss this merge suggestion"
                    >
                      Dismiss
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmCandidate && (
        <Dialog
          open={!!confirmCandidate}
          onClose={() => setConfirmCandidate(null)}
          title="Confirm merge"
        >
          <div className="space-y-4">
            <p className="text-sm text-white/60">
              Merge <strong className="text-white">&ldquo;{confirmCandidate.entity2.name}&rdquo;</strong> into{' '}
              <strong className="text-white">&ldquo;{confirmCandidate.entity1.name}&rdquo;</strong>.
              All mentions and connections will be reassigned.
            </p>
            <p className="text-xs text-orange-400/80 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
              This action cannot be undone automatically. Relationships will be preserved.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                variant="primary"
                className="flex-1"
                loading={merging}
                onClick={() => handleMerge(confirmCandidate.entity1.id, confirmCandidate.entity2.id)}
              >
                {merging ? 'Merging' : 'Confirm merge'}
              </Button>
              <Button variant="secondary" onClick={() => setConfirmCandidate(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
