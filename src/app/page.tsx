'use client'

import { useCallback, useEffect, useState } from 'react'
import { GraphViewer } from '@/components/graph-viewer'
import { EntityPanel } from '@/components/entity-panel'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RefreshCw, Search } from 'lucide-react'
import type { GraphData, GraphNode, EntityType } from '@/types'

const TYPE_FILTERS: { label: string; value: EntityType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'People', value: 'person' },
  { label: 'Orgs', value: 'organization' },
  { label: 'Emails', value: 'email' },
  { label: 'URLs', value: 'url' },
]

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<EntityType | 'all'>('all')
  const [search, setSearch] = useState('')

  const fetchGraph = useCallback(async (type?: EntityType | 'all') => {
    setLoading(true)
    try {
      const url = type && type !== 'all' ? `/api/graph?type=${type}` : '/api/graph'
      const res = await fetch(url)
      const data = await res.json()
      setGraphData(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchGraph() }, [fetchGraph])

  const handleTypeFilter = (value: EntityType | 'all') => {
    setTypeFilter(value)
    fetchGraph(value)
  }

  const handleEntityClick = useCallback((entityId: number) => {
    const node = graphData.nodes.find(n => n.id === `e${entityId}`)
    if (node) setSelectedNode(node)
  }, [graphData.nodes])

  const highlightNodes = search
    ? new Set(graphData.nodes
        .filter(n => n.name.toLowerCase().includes(search.toLowerCase()))
        .map(n => n.id))
    : undefined

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-5 h-14 border-b border-white/[0.06] shrink-0">
        <h1 className="text-sm font-semibold text-white mr-2">Graph Explorer</h1>

        <div className="relative w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-white/30 pointer-events-none" aria-hidden />
          <Input
            type="search"
            placeholder="Search nodes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
            aria-label="Search graph nodes"
          />
        </div>

        <div className="flex items-center gap-1" role="group" aria-label="Filter by entity type">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => handleTypeFilter(f.value)}
              aria-pressed={typeFilter === f.value}
              className={`h-7 px-3 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
                typeFilter === f.value
                  ? 'bg-white/[0.10] text-white'
                  : 'text-white/40 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-white/30 font-mono tabular-nums hidden sm:block">
            {graphData.nodes.length}&nbsp;nodes&nbsp;·&nbsp;{graphData.links.length}&nbsp;edges
          </span>
          <Button size="sm" variant="ghost" onClick={() => fetchGraph(typeFilter)} aria-label="Refresh graph">
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        </div>
      </header>

      {/* Graph + Panel */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 relative">
          {loading && graphData.nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="size-6 rounded-full border-2 border-white/10 border-t-white animate-spin" aria-hidden />
                <p className="text-xs text-white/30">Loading graph&hellip;</p>
              </div>
            </div>
          ) : (
            <GraphViewer
              data={graphData}
              selectedNode={selectedNode}
              highlightNodes={highlightNodes}
              onNodeClick={setSelectedNode}
              className="w-full h-full"
            />
          )}
        </div>

        <EntityPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onEntityClick={handleEntityClick}
        />
      </div>
    </div>
  )
}
