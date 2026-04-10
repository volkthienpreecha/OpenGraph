'use client'

import { useState } from 'react'
import { GraphViewer } from '@/components/graph-viewer'
import { EntityPanel } from '@/components/entity-panel'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Search, GitMerge } from 'lucide-react'
import type { GraphData, GraphNode } from '@/types'

type QueryMode = 'search' | 'path'

export default function QueryPage() {
  const [mode, setMode] = useState<QueryMode>('search')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [hops, setHops] = useState(4)
  const [result, setResult] = useState<{ nodes?: GraphNode[]; links?: unknown[]; message?: string; entities?: GraphNode[] } | null>(null)
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const body = mode === 'path'
        ? { from, to, hops }
        : { q }

      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Query failed')

      setResult(data)
      if (data.nodes && data.links) {
        setGraphData({ nodes: data.nodes, links: data.links as GraphData['links'] })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Query failed')
    } finally {
      setLoading(false)
    }
  }

  const handleEntityPanelClick = (entityId: number) => {
    const node = graphData.nodes.find(n => n.id === `e${entityId}`)
    if (node) setSelectedNode(node)
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center gap-3 px-6 h-14 border-b border-white/[0.06] shrink-0">
        <h1 className="text-sm font-semibold text-white">Query</h1>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Left: query form */}
        <div className="w-[360px] shrink-0 border-r border-white/[0.06] flex flex-col overflow-y-auto">
          <div className="px-6 py-6 space-y-6">
            {/* Mode tabs */}
            <div className="flex gap-1 p-1 bg-white/[0.04] rounded-lg" role="tablist" aria-label="Query mode">
              {([
                { value: 'search', label: 'Search', icon: Search },
                { value: 'path', label: 'Find Path', icon: GitMerge },
              ] as const).map(m => (
                <button
                  key={m.value}
                  role="tab"
                  aria-selected={mode === m.value}
                  onClick={() => { setMode(m.value); setResult(null) }}
                  className={`flex-1 flex items-center justify-center gap-2 h-8 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
                    mode === m.value ? 'bg-white/[0.10] text-white' : 'text-white/40 hover:text-white'
                  }`}
                >
                  <m.icon className="size-3" aria-hidden />
                  {m.label}
                </button>
              ))}
            </div>

            {/* Query form */}
            <form onSubmit={handleQuery} className="space-y-4">
              {mode === 'search' ? (
                <div className="space-y-2">
                  <label htmlFor="search-q" className="text-xs text-white/50">
                    Search for an entity or keyword
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-white/30 pointer-events-none" aria-hidden />
                    <Input
                      id="search-q"
                      placeholder="e.g. Sam Altman, OpenAI…"
                      value={q}
                      onChange={e => setQ(e.target.value)}
                      className="pl-8"
                      autoFocus
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label htmlFor="from-entity" className="text-xs text-white/50">From entity</label>
                    <Input
                      id="from-entity"
                      placeholder="e.g. Sam Altman"
                      value={from}
                      onChange={e => setFrom(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="size-3.5 text-white/20 shrink-0 mx-auto" aria-hidden />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="to-entity" className="text-xs text-white/50">To entity</label>
                    <Input
                      id="to-entity"
                      placeholder="e.g. OpenAI"
                      value={to}
                      onChange={e => setTo(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="max-hops" className="text-xs text-white/50">Max hops: {hops}</label>
                    <input
                      id="max-hops"
                      type="range"
                      min={1}
                      max={8}
                      value={hops}
                      onChange={e => setHops(parseInt(e.target.value))}
                      className="w-full accent-white/50"
                      aria-label={`Maximum hops: ${hops}`}
                    />
                  </div>
                </div>
              )}

              <Button type="submit" variant="primary" className="w-full" loading={loading}>
                {loading ? 'Querying' : 'Run query'}
              </Button>
            </form>

            {/* Result message */}
            {error && (
              <div role="alert" className="text-xs text-red-400 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                {error}
              </div>
            )}

            {result?.message && !error && (
              <div role="status" aria-live="polite" className="text-xs text-white/50 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                {result.message}
              </div>
            )}

            {/* Search results list */}
            {result?.entities && result.entities.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] text-white/30 uppercase tracking-wider">{result.entities.length} matches</p>
                <ul className="space-y-1">
                  {result.entities.map((e: GraphNode) => (
                    <li key={e.id}>
                      <button
                        onClick={() => setSelectedNode(e)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                      >
                        <span className="size-2 rounded-full shrink-0" style={{ background: e.color }} />
                        <span className="text-sm text-white/70 truncate">{e.name}</span>
                        <Badge variant={e.type as 'person'} className="ml-auto shrink-0">{e.type}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right: graph result */}
        <div className="flex-1 relative flex min-h-0">
          <div className="flex-1">
            {graphData.nodes.length > 0 ? (
              <GraphViewer
                data={graphData}
                selectedNode={selectedNode}
                onNodeClick={setSelectedNode}
                className="w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <GitMerge className="size-8 mx-auto mb-3 text-white/10" aria-hidden />
                  <p className="text-sm text-white/20">Run a query to see results</p>
                </div>
              </div>
            )}
          </div>

          <EntityPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onEntityClick={handleEntityPanelClick}
          />
        </div>
      </div>
    </div>
  )
}
